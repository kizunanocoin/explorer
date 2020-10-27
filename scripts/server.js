'use strict';

const _ = require("lodash");
const express = require("express");
const nanode = require("nanode");
const os = require("os");
const cors = require("cors");
const axios = require('axios').default;
const BigNumber = require("bignumber.js");

const app = express();
const nano = new nanode.Nano({ url: 'http://rpc.kizunanocoin.com' });
const config = {
    "nodeName": "explorer.kizunanocoin.com",
    "account": "kizn_1kmo3ndb6hfxzjm459zi8g4da3rm76endb65h9rjtqojoypq6it8d776w96d",
    "clientUrl": "https://explorer.kizunanocoin.com",
    "raiblocksDir": "/home/ryanlefevre/RaiBlocks",
    "nodeHost": "http://localhost:3000",
    "redis": "redis://127.0.0.1:6379",
    "redisNamespace": "development",
    "serverPort": 3001,
    "coinMarketCapApiKey": "",
    "monitorCurrencyName": "kizn",
    "knownMonitors": [],
    "blacklistedPeers": [],
    "officialRepresentatives": [
        "kizn_1e8a1is3cb8okj9k9yuim73mq46jrtnnsnhdtydpkb76apw9gyrjthbc4mso",
        "kizn_3jottfzje496q53ipxy6zgkbheeg5ok1qzm93ggkpabw3aydj8nc3kcssjoy",
        "kizn_1kmo3ndb6hfxzjm459zi8g4da3rm76endb65h9rjtqojoypq6it8d776w96d",
        "kizn_1abnqj5paqjc8h9k5yba57d9nbebggyyy1kyctken3sqqxbyp1oombdm5jjd",
        "kizn_3phmy7fguk7eun9ck8yeekhjnraokb1x1c996dq573euxehhjkawuhjmhsxb",
    ]
};

app.use(cors());

function accountIsValid(account) {
    return /^\w+_[A-Za-z0-9]{59,60}$/.test(account);
}

function blockIsValid(hash) {
    return /^[A-F0-9]{64}$/.test(hash);
}

function fromRaw(raw) {
    const value = BigNumber(raw.toString());
    return value.shiftedBy(6 * -1).toNumber();
}

function toRaw(mvalue) {
    const value = BigNumber(mvalue.toString());
    return value.shiftedBy(6).toString(10);
}

async function processBlock(hash, block, convert = false) {
    if (convert) {
        block.amount = fromRaw(block.amount);
    }

    block.contents = JSON.parse(block.contents);

    if (parseInt(block.contents.previous, 16) === 0) {
        block.contents.subtype = "open";
    } else {
        const resp = await nano.rpc("account_history", {
            account: block.block_account,
            head: hash,
            raw: true,
            count: 1
        });

        block.contents.subtype = resp.history[0].subtype;
    }

    if (convert) {
        switch (block.contents.type) {
            case "send":
                block.contents.balance = fromRaw(
                    parseInt(block.contents.balance, 16).toString()
                );
                break;
            case "state":
                block.contents.balance = fromRaw(block.contents.balance);
                break;
        }
    }

    return block;
}

/*
 * ====================================================================================
 *
 *                                      API v1
 * 
 * ====================================================================================
 */

/*
 * Return this explorere accpimt
 */
app.get("/account", async (req, res) => {
    return res.json({ account: config.account });
});

/*
 * Returns list of accounts
 */
app.get("/accounts/:page(\\d+)", async (req, res, next) => {
    try {
        const data = async function () {
            var total = (await nano.rpc("frontier_count")).count;
            const frontiers = await nano.rpc("frontiers", { account: config.account, count: total });
            const balances = (await nano.accounts.balances(Object.keys(frontiers.frontiers))).balances;

            const accounts = [];
            for (var address in balances) {
                const balance = fromRaw(balances[address].balance);
                if (balance > 0) {
                    accounts.push({ account: address, balance: balance });
                } else {
                    total--;
                }
            }

            return res.json({ total: total, perPage: 50, accounts: accounts });
        }();
    } catch (e) {
        next(e);
    }
});

/*
 * Returns distribution of kizunanocoin
 */
app.get("/accounts/distribution", async (req, res, next) => {
    try {
        const data = async function () {
            const total = (await nano.rpc("frontier_count")).count;
            const frontiers = await nano.rpc("frontiers", { account: config.account, count: total });
            const balances = (await nano.accounts.balances(Object.keys(frontiers.frontiers))).balances;

            var distribution = {
                "10": 0,
                "100": 0,
                "1000": 0,
                "10000": 0,
                "100000": 0,
                "1000000": 0,
                "10000000": 0,
                "100000000": 0,
                "1000000000": 0,
                "10000000000": 0
            };

            for (var address in balances) {
                const balance = fromRaw(balances[address].balance);

                if (1 <= balance && balance < 10) {
                    distribution["10"]++;
                }
                if (10 <= balance && balance < 100) {
                    distribution["100"]++;
                }
                if (100 <= balance && balance < 1000) {
                    distribution["1000"]++;
                }
                if (1000 <= balance && balance < 10000) {
                    distribution["10000"]++;
                }
                if (10000 <= balance && balance < 100000) {
                    distribution["100000"]++;
                }
                if (100000 <= balance && balance < 1000000) {
                    distribution["1000000"]++;
                }
                if (1000000 <= balance && balance < 10000000) {
                    distribution["10000000"]++;
                }
                if (10000000 <= balance && balance < 100000000) {
                    distribution["100000000"]++;
                }
                if (100000000 <= balance && balance < 1000000000) {
                    distribution["1000000000"]++;
                }
                if (1000000000 <= balance) {
                    distribution["10000000000"]++;
                }
            }

            return res.json({ "distribution": distribution });
        }();
    } catch (e) {
        next(e);
    }
});

/*
 * Returns current block count
 */
app.get("/block_count", async (req, res, next) => {
    try {
        const data = async function () {
            const blockCount = await nano.blocks.count();
            return res.json({ blockCount });
        }();
    } catch (e) {
        next(e);
    }
});

/*
 * Returns current block count by type
 */
app.get("/block_count_by_type", async (req, res, next) => {
    try {
        const data = async function () {
            const blockCount = res.json(await nano.blocks.count(true));
            return res.json(blockCount);
        }();
    } catch (e) {
        next(e);
    }
});

/*
 * Returns null data
 */
app.get("/network_data", async (req, res, next) => {
    try {
        const data = async function () {
            const telemetry = await nano.rpc("telemetry");
            const quorum = await nano.rpc("confirmation_quorum");

            res.json({
                network: [
                    {
                        url: "https://explorer.kizunanocoin.com/api/api.php",
                        data: {
                            "currentBlock": parseInt(telemetry.block_count, 10),
                            "uncheckedBlocks": parseInt(telemetry.unchecked_count, 10),
                            "cementedBlocks": parseInt(telemetry.cemented_count, 10),
                            "numPeers": parseInt(telemetry.peer_count, 10),
                            "votingWeight": parseInt(quorum.online_stake_total, 10),
                            "protocol_version": parseInt(telemetry.protocol_version, 10),
                            "nodeUptimeStartup": parseInt(telemetry.uptime, 10)
                        }
                    }
                ]
            });
        }();
    } catch (e) {
        next(e);
    }
});

/*
 * Returns null data
 */
app.get("/tps/:period", async (req, res, next) => {
    try {
        res.json({ tps: 0.0 });
    } catch (e) {
        next(e);
    }
});

/*
 * Returns information about node elections settings & observed network state
 */
app.get("/confirmation_quorum", async (req, res, next) => {
    try {
        const data = async function () {
            const data = await nano.rpc("confirmation_quorum");

            data.quorum_delta_mnano = fromRaw(data.quorum_delta);
            data.online_weight_minimum_mnano = fromRaw(
                data.online_weight_minimum
            );
            data.online_stake_total_mnano = fromRaw(data.online_stake_total);
            data.peers_stake_total_mnano = fromRaw(data.peers_stake_total);

            return res.json(data);
        }();

        ////res.json(data);
    } catch (e) {
        next(e);
    }
});

app.get("/peer_count", async (req, res, next) => {
    try {
        const peerCount = async function () {
            return res.json({ peerCount: _.keys((await nano.rpc("peers")).peers).length });
        }();

        ////res.json({ peerCount: peerCount });
    } catch (e) {
        next(e);
    }
});

app.get("/peers", async (req, res) => {
    try {
        const peers = async function () {
            return res.json(await nano.rpc("peers"));
        }();

        ////res.json(peers);
    } catch (e) {
        next(e);
    }
});

/*
 * Returns node version
 */
app.get("/version", async (req, res, next) => {
    try {
        return res.json(await nano.rpc("version"));
    } catch (e) {
        next(e);
    }
});

/*
 * Returns system information
 */
app.get("/system_info", async (req, res, next) => {
    try {
        const data = async function () {
            return res.json({
                uptime: os.uptime(),
                loadAvg: os.loadavg(),
                memory: {
                    free: os.freemem(),
                    total: os.totalmem()
                },
                dbSize: 0,
                raiStats: {
                    cpu: 0,
                    memory: os.totalmem() - os.freemem(),
                    elapsed: 0
                }
            });
        }();

        ////res.json(data);
    } catch (e) {
        next(e);
    }
});

/*
 * ====================================================================================
 *
 *                                      API v2
 * 
 * ====================================================================================
 */

/*
 * account_info
 * General account information
 */
app.get("/v2/accounts/:account", async (req, res, next) => {
    if (!accountIsValid(req.params.account)) {
        //return next(new BadRequest("Invalid account"));
        return res.status(400).send("Invalid account");
    }

    try {
        const account = async function () {
            const data = await nano.rpc("account_info", {
                account: req.params.account,
                representative: true,
                weight: true,
                pending: true
            });

            if (data.error) {
                switch (data.error) {
                    case "Bad account number":
                        //throw new BadRequest(data.error);
                        return res.status(400).send(data.error);
                    case "Account not found":
                        //throw new NotFound(data.error);
                        return res.status(404).send(data.error);
                    default:
                        //throw new Error(data.error);
                        return res.status(500).send(data.error);
                }
            }

            //return data;
            return res.json({ "account": data });
        }();

        //res.json({ account });
    } catch (e) {
        next(e);
    }
});

/*
 * account_weight
 * Fetches only account weight
 */
app.get("/v2/accounts/:account/weight", async (req, res, next) => {
    if (!accountIsValid(req.params.account)) {
        //return next(new BadRequest("Invalid account"));
        return res.status(400).send("Invalid account");
    }

    try {
        const weight = async function () {
            return res.json({ "weight": await nano.accounts.weight(req.params.account) });
        }();

        ////res.json({ weight });
    } catch (e) {
        next(e);
    }
});

/*
 * delegators
 * Fetches all account delegators
 */
app.get("/v2/accounts/:account/delegators", async (req, res, next) => {
    if (!accountIsValid(req.params.account)) {
        //return next(new BadRequest("Invalid account"));
        return res.status(400).send("Invalid account");
    }

    try {
        const delegators = async function () {
            return res.json(await nano.rpc("delegators", {
                account: req.params.account
            }));
        }();

        ////res.json(delegators);
    } catch (e) {
        next(e);
    }
});

/*
 * account_history
 * Paginated fetch of account history
 */
app.get("/v2/accounts/:account/history", async (req, res, next) => {
    if (!accountIsValid(req.params.account)) {
        //return next(new BadRequest("Invalid account"));
        return res.status(400).send("Invalid account");
    }

    if (req.query.head) {
        if (req.query.head.length !== 64 || /[^A-F0-9]+/.test(req.query.head)) {
            //return next(new BadRequest("Invalid head block"));
            return res.status(400).send("Invalid head block");
        }
    }

    try {
        const history = async function () {
            const resp = await nano.rpc("account_history", {
                account: req.params.account,
                count: 50,
                raw: "true",
                head: req.query.head
            });

            if (resp.error) {
                switch (resp.error) {
                    case "Bad account number":
                        //throw new BadRequest(resp.error);
                        return res.status(400).send(resp.error);
                    default:
                        //throw new Error(resp.error);
                        return res.status(500).send(resp.error);
                }
            }

            if (resp.history === "") {
                //throw new NotFound("Account not found");
                return res.status(404).send("Account not found");
            }

            const { history } = resp;

            for (let i = 0; i < history.length; i++) {
                history[i].timestamp = 0;
            }

            return res.json(history);
        }();

        ////res.json(history);
    } catch (e) {
        next(e);
    }
});

/*
 * accounts_pending
 * Fetches up to 20 pending transactions for an account.
 * Does some extra processing on the response to make it easier for the frontend
 * to utilize.
 */
app.get("/v2/accounts/:account/pending", async (req, res, next) => {
    if (!accountIsValid(req.params.account)) {
        //return next(new BadRequest("Invalid account"));
        return res.status(400).send("Invalid account");
    }

    try {
        const data = async function () {
            const resp = await nano.rpc("accounts_pending", {
                accounts: [req.params.account],
                source: true,
                threshold: toRaw(0.000001),
                sorting: true
            });

            if (resp.error) {
                //throw new BadRequest(resp.error);
                return res.status(400).send(resp.error);
            }

            // Since it can be unpredictable whether the node returns a xrb_ or nano_ address,
            // and because we know we're only fetching 1 account here, we just grab the first (and only)
            // key in the hash.
            const allBlocks = resp.blocks[_.keys(resp.blocks)[0]];
            const blocks = _.toPairs(allBlocks)
                .slice(0, 20)
                .map(data => {
                    return {
                        type: "pending",
                        amount: data[1].amount,
                        hash: data[0],
                        source: data[1].source
                    };
                });

            for (let i = 0; i < blocks.length; i++) {
                blocks[i].timestamp = 0;
            }

            const pendingBalance = (await nano.rpc("account_balance", {
                account: req.params.account
            })).pending;

            return res.json({
                total: _.keys(allBlocks).length,
                blocks,
                pendingBalance
            });
        }();

        ////res.json(data);
    } catch (e) {
        next(e);
    }
});

/*
 * blocks_info
 * Retrieves information about a single block
 */
app.get("/v2/blocks/:hash", async (req, res, next) => {
    if (!blockIsValid(req.params.hash)) {
        //return next(new BadRequest("Block hash is invalid"));
        return res.status(400).send("Block hash is invalid");
    }

    try {
        const block = await async function () {
            const resp = await nano.rpc("blocks_info", {
                hashes: [req.params.hash],
                pending: true,
                source: true
            });

            if (resp.error) {
                switch (resp.error) {
                    case "Block not found":
                        //throw new NotFound(resp.error);
                        return res.status(404).send(resp.error);
                    default:
                        //throw new BadRequest(resp.error);
                        return res.status(400).send(resp.error);
                }
            }

            let block = resp.blocks[req.params.hash];
            block.timestamp = 0;
            return res.json(await processBlock(req.params.hash, block));
        }();

        ////res.json(block);
    } catch (e) {
        next(e);
    }
});

app.get("/v2/confirmation/history", async (req, res, next) => {
    try {
        const data = await async function () {
            const resp = await nano.rpc("confirmation_history");
            if (!resp.confirmations) resp.confirmations = [];
            resp.confirmations.sort((a, b) => {
                const timeA = parseInt(a.time, 10);
                const timeB = parseInt(b.time, 10);
                if (timeA === timeB) return 0;
                return timeA > timeB ? -1 : 1;
            });

            if (req.query.count && /\d+/.test(req.query.count)) {
                resp.confirmations = resp.confirmations.slice(
                    0,
                    parseInt(req.query.count, 10)
                );
            }

            return res.json(resp);
        }();

        ////res.json(data);
    } catch (e) {
        next(e);
    }
});

/*
 * active_difficulty
 * Returns the current network PoW difficulty level
 * Includes difficulty trend
 */
app.get("/v2/network/active_difficulty", async (req, res, next) => {
    try {
        const data = async function () {
            return res.json(await nano.rpc("active_difficulty", { include_trend: true }));
        }();

        ////res.json(data);
    } catch (e) {
        next(e);
    }
});

/*
 * peers
 * Combines peers with confirmation_quorum to tie together peer addresses
 * and representative addresses.
 */
app.get("/v2/network/peers", async (req, res, next) => {
    try {
        const data = async function () {
            const allPeers = (await nano.rpc("peers", { peer_details: true })).peers;

            const peers = [];

            for (var ip in allPeers) {
                peers.push({
                    ip: ip,
                    account: allPeers[ip].node_id,
                    weight: 0,
                    protocol_version: allPeers[ip].protocol_version,
                    type: allPeers[ip].type,
                });
            }

            /*const data = _.map(allPeers, (peer, address) => {
                const repInfo = quorumPeers.find(p => p.ip === address);

                return {
                    ip: address,
                    account: repInfo ? repInfo.account : null,
                    weight: repInfo ? repInfo.weight : null,
                    protocol_version: peer.protocol_version,
                    type: peer.type
                };
            });*/

            res.json({ peers: peers });
        }();

        ////res.json({ peers: data });
    } catch (e) {
        next(e);
    }
});

/*
 * representatives_online
 * Returns hash of online representatives, including their voting weight
 */
app.get("/v2/representatives/online", async (req, res, next) => {
    try {
        const representatives = async function () {
            const repsOnline = (await nano.rpc("representatives_online", {
                weight: true
            })).representatives;

            return res.json({
                "representatives": _.fromPairs(
                    _.map(repsOnline, (data, account) => [account, data.weight])
                )
            });
        }();

        ////res.json({ representatives });
    } catch (e) {
        next(e);
    }
});

/*
 * representatives
 * Returns list of official representatives only, with their voting weight
 */
app.get("/v2/representatives/official", async (req, res, next) => {
    try {
        const representatives = async function () {
            const reps = (await nano.rpc("representatives")).representatives;
            return res.json({
                "representatives": _.fromPairs(
                    config.officialRepresentatives.map(addr => [addr, reps[addr]])
                )
            });
        }();

        ////res.json({ representatives });
    } catch (e) {
        next(e);
    }
});

/*
 * get USD and BTC price
 */
app.get("/v2/ticker", async (req, res, next) => {
    try {
        const result = await axios.get("https://coinutil.net/currencies/info/kizunacoin");
        res.json({ "USD": result.data.price_usd, "BTC": result.data.price_btc });
    } catch (e) {
        next(e);
    }
});

const server = app.listen(3001, function () {
    console.log("Node.js is listening to PORT:" + server.address().port);
});