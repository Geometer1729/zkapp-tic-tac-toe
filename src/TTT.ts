import { Field, SmartContract, state, State, method, Gadgets, Bool, assert } from 'o1js';

export class TTT extends SmartContract {
  @state(Field) xs = State<Field>();
  @state(Field) os = State<Field>();
  @state(Bool) turn = State<Bool>();
  // True when it's x's turn

  init() {
    super.init()
    this.xs.set(Field.from(0));
    this.os.set(Field.from(0));
    this.turn.set(Bool(true));
  }

  // True is xs
  // expected_turn is a debug variable
  @method async move(move : Field) {
    // TODO track the player for each side and require a signature?
    // also sync with the chain less

    // AFAICT it's not easy to do 2^n in a proof?
    // so I'll require the user compute it and
    // check that move is a power of 2 instead of taking the index
    // and computing the power of 2

    move.assertNotEquals(0);
    assert(move.lessThanOrEqual(2 << 9));
    // Check for ones distance one appart
    const move_l1 = Gadgets.leftShift32(move,1);
    assert(Gadgets.and(move_l1,move,10).equals(0));
    //Check for ones distance 2 or 3 appart
    const move_c2 = Gadgets.xor(move,move_l1,10);
    const move_l2 = Gadgets.leftShift32(move_c2,2);
    assert(Gadgets.and(move_l2,move_c2,11).equals(0));
    //Check for ones distance 4-7 appart
    const move_c4 = Gadgets.xor(move,move_l2,14);
    const move_l4 = Gadgets.leftShift32(move_c4,4);
    assert(Gadgets.and(move_l4,move_c4,14).equals(0));
    // The only way to have distance 8 is 257
    move.assertNotEquals(257);
    // TODO double check this is all correct

    const turn = this.turn.getAndRequireEquals().toField();
    const xs = this.xs.getAndRequireEquals();
    const os = this.os.getAndRequireEquals();

    assert(Gadgets.and(xs.add(os),move,9).equals(0),"Square was taken");

    const nextTurn = Field.from(1).sub(turn);
    this.turn.set(nextTurn.equals(1));
    let xsNew = xs.add(turn.mul(move));
    let osNew = os.add(nextTurn.mul(move));
    this.xs.set(xsNew);
    this.os.set(osNew);
  }
}
