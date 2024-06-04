import { AccountUpdate, Bool, Field, Mina, PrivateKey, PublicKey } from 'o1js';
import { TTT } from './TTT';

/*
 * This file specifies how to test the `Add` example smart contract. It is safe to delete this file and replace
 * with your own tests.
 *
 * See https://docs.minaprotocol.com/zkapps for more info.
 */

let proofsEnabled = false;

describe('TTT', () => {
  let deployerAccount: Mina.TestPublicKey,
    deployerKey: PrivateKey,
    senderAccount: Mina.TestPublicKey,
    senderKey: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: TTT;

  beforeAll(async () => {
    if (proofsEnabled) await TTT.compile();
  });

  beforeEach(async () => {
    const Local = await Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    [deployerAccount, senderAccount] = Local.testAccounts;
    deployerKey = deployerAccount.key;
    senderKey = senderAccount.key;

    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new TTT(zkAppAddress);
  });

  async function localDeploy() {
    const txn = await Mina.transaction(deployerAccount, async () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      await zkApp.deploy();
    });
    await txn.prove();
    // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
    await txn.sign([deployerKey, zkAppPrivateKey]).send();
  }

  it('generates and deploys the `TTT` smart contract', async () => {
    await localDeploy();
    const xs = zkApp.xs.get();
    expect(xs).toEqual(Field(0));
    const os = zkApp.os.get();
    expect(os).toEqual(Field(0));
    const turn = zkApp.turn.get();
    expect(turn).toEqual(Bool(true));
  });

  it('correctly updates the num state on the `TTT` smart contract', async () => {
    await localDeploy();

    // update transaction
    const txn = await Mina.transaction(senderAccount, async () => {
      await zkApp.move(Field(1));
    });
    await txn.prove();
    await txn.sign([senderKey]).send();

    const xs = zkApp.xs.get();
    expect(xs).toEqual(Field(1));
    const os = zkApp.os.get();
    expect(os).toEqual(Field(0));
    const turn = zkApp.turn.get();
    expect(turn).toEqual(Bool(false));

    const txn2 = await Mina.transaction(senderAccount, async () => {
      await zkApp.move(Field(4));
    });
    await txn2.prove();
    await txn2.sign([senderKey]).send();

    const xs_2 = zkApp.xs.get();
    expect(xs_2).toEqual(Field(1));
    const os_2 = zkApp.os.get();
    expect(os_2).toEqual(Field(4));
    const turn_2 = zkApp.turn.get();
    expect(turn_2).toEqual(Bool(true));
  });
})
