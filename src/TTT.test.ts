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

  async function doMoveRaw(move : number,claimWin : number) {
    const txn = await Mina.transaction(senderAccount, async () => {
      await zkApp.moveRaw(Field(move),Field(claimWin));
    });
    await txn.prove();
    await txn.sign([senderKey]).send();
  }

  async function doMove(move : number) {
    const txn = await Mina.transaction(senderAccount,await zkApp.move(move));
    await txn.prove();
    await txn.sign([senderKey]).send();
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

  it('Play a couple moves and onchain data looks correct', async () => {
    await localDeploy();

    expect(zkApp.xs.get()).toEqual(Field(0));
    expect(zkApp.os.get()).toEqual(Field(0));
    expect(zkApp.turn.get()).toEqual(Bool(true));
    expect(zkApp.won.get()).toEqual(Bool(false));

    await doMove(0)

    expect(zkApp.xs.get()).toEqual(Field(1 << 0));
    expect(zkApp.os.get()).toEqual(Field(0));
    expect(zkApp.turn.get()).toEqual(Bool(false));
    expect(zkApp.won.get()).toEqual(Bool(false));

    await doMove(2)

    expect(zkApp.xs.get()).toEqual(Field(1 << 0));
    expect(zkApp.os.get()).toEqual(Field(1 << 2));
    expect(zkApp.turn.get()).toEqual(Bool(true));
    expect(zkApp.won.get()).toEqual(Bool(false));

  });

  it('correctly claims a win', async () => {
    await localDeploy();
    await doMove(0);
    await doMove(5);
    await doMove(1);
    await doMove(8);
    await doMove(2);
    expect(zkApp.won.get()).toEqual(Bool(true));

  });

  it('correctly claims a diagonal win', async () => {
    await localDeploy();
    await doMove(0);
    await doMove(2);
    await doMove(4);
    await doMove(6);
    await doMove(8);
    expect(zkApp.won.get()).toEqual(Bool(true));

  });

  it('correctly claims a win as o', async () => {
    await localDeploy();
    await doMove(0);
    await doMove(3);
    await doMove(1);
    await doMove(4);
    await doMove(8);
    await doMove(5);
    expect(zkApp.won.get()).toEqual(Bool(true));

  });

  it('bad win claim fails', async () => {
    await localDeploy();
    await doMove(0);
    await doMove(3);
    await doMove(1);
    expect(doMoveRaw(1 << 4,18))
      .rejects
      .toThrowError()
  });

  it('non-power of 2 moves rejected', async () => {
    await localDeploy();
    for (let i=0; i <= 1<<9 ; i++) {
      if (![1,2,4,8,16,32,64,128,256,512].includes(i)) {
        await expect(doMoveRaw(i,0))
          .rejects
          .toThrowError()
      }
    }
  });
})

