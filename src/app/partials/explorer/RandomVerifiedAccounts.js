import React, { Fragment } from "react";
import { TranslatedMessage } from "lib/TranslatedMessage";
import sampleSize from "lodash/sampleSize";

import AccountLink from "../AccountLink";

export default class RandomVerifiedAccounts extends React.Component {
  state = { accounts: [] };

  async componentDidMount() {
    /*const data = await fetch("https://mynano.ninja/api/accounts/verified", {
      mode: "cors"
    });
    const accounts = await data.json();*/
    var accounts = [
      {"account":"kizn_1e8a1is3cb8okj9k9yuim73mq46jrtnnsnhdtydpkb76apw9gyrjthbc4mso", "alias":"The KIZUNANO Association #1"},
      {"account":"kizn_3jottfzje496q53ipxy6zgkbheeg5ok1qzm93ggkpabw3aydj8nc3kcssjoy", "alias":"The KIZUNANO Association #2"},
      {"account":"kizn_1kmo3ndb6hfxzjm459zi8g4da3rm76endb65h9rjtqojoypq6it8d776w96d", "alias":"The KIZUNANO Association #3"},
      {"account":"kizn_1abnqj5paqjc8h9k5yba57d9nbebggyyy1kyctken3sqqxbyp1oombdm5jjd", "alias":"The KIZUNANO Association #4"},
      {"account":"kizn_3phmy7fguk7eun9ck8yeekhjnraokb1x1c996dq573euxehhjkawuhjmhsxb", "alias":"The KIZUNANO Association #5"},
    ]

    this.setState({ accounts: sampleSize(accounts, this.props.count) });
  }

  render() {
    return (
      <Fragment>
        <h3 className="mb-0">
          <TranslatedMessage id="ninja.verified_accounts" />
        </h3>
        <p className="text-muted">
          <TranslatedMessage
            id="ninja.verified_accounts.desc"
            values={{
              link: (
                <a
                  href="https://explorer.kizunanocoin.com/"
                  target="_self"
                  className="text-muted"
                >
                  KIZUNANO COIN Blockchain Explorer
                </a>
              )
            }}
          />
        </p>

        <hr />

        {this.state.accounts.map(account => (
          <VerifiedAccount key={account.account} account={account} />
        ))}
      </Fragment>
    );
  }
}

const VerifiedAccount = ({ account }) => {
  return (
    <div className="row">
      <div className="col">
        <h5 className="mb-0">
          <AccountLink
            account={account.account}
            name={account.alias}
            className="text-dark break-word"
          />
        </h5>
        <p>
          <AccountLink
            account={account.account}
            className="text-muted break-word"
          />
        </p>
      </div>
    </div>
  );
};
