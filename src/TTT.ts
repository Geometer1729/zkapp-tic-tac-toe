import { Field, SmartContract, state, State, method, Gadgets, Bool, assert } from 'o1js';

let row = 0b111;
let col = 0b1001001;
let win_numbers =
  [ Field(row) , Field(row << 3) , Field(row << 6)
  , Field(col) , Field(col << 1) , Field(col << 2)
  , Field(0b100010001) , Field(0b001010100) // Diagonals
  ]

export class TTT extends SmartContract {
  @state(Field) xs = State<Field>();
  @state(Field) os = State<Field>();
  @state(Bool) turn = State<Bool>();
  @state(Bool) won = State<Bool>();
  // True when it's x's turn

  init() {
    super.init()
    this.xs.set(Field.from(0));
    this.os.set(Field.from(0));
    this.turn.set(Bool(true));
  }

  async move(move : number) {
    let move_val = Field(1 << move);
    let win = Field(0);
    for(let n of win_numbers){
      if(this.turn.get().toBoolean()) {
        if(Gadgets.and(this.xs.get().add(move_val),n,9).equals(n).toBoolean()) {
          win = n;
        }
      } else {
        if(Gadgets.and(this.os.get().add(move_val),n,9).equals(n).toBoolean()) {
          win = n;
        }
      }
    }
    return ( async () => { await this.moveRaw(move_val,win); })
  }
  // winClaim of 0 to not claim a win
  @method async moveRaw(move : Field, winClaim : Field) {
    // TODO track the player for each side and require a signature?
    // also sync with the chain less

    // AFAICT it's not easy to do 2^n in a proof?
    // so I'll require the user compute it and
    // check that move is a power of 2 instead of taking the index
    // and computing the power of 2

    move.assertNotEquals(0);
    assert(move.lessThanOrEqual(1 << 9));
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


    let validWinNumber = win_numbers.map(n => winClaim.equals(n)).reduce((a,b) => a.or(b),Bool(false));
    let winnerBoard = xsNew.mul(turn).add(osNew.mul(nextTurn));
    let boardSupportsWin = Gadgets.and(winnerBoard,winClaim,9).equals(winClaim);
    assert((validWinNumber.and(boardSupportsWin)).or(winClaim.equals(0)));
    this.won.set(winClaim.equals(0).not())
  }
}
