import { Field, SmartContract, state, State, method, Gadgets, Bool, assert, ZkProgram, Struct, SelfProof, Proof } from 'o1js';


export class TTT extends SmartContract {
  @state(Field) xs = State<Field>();
  @state(Field) os = State<Field>();
  @state(Bool) turn = State<Bool>();
  @state(Bool) won = State<Bool>();
  @state(Bool) drawn = State<Bool>();
  // True when it's x's turn

  init() {
    super.init()
    this.xs.set(Field.from(0));
    this.os.set(Field.from(0));
    this.turn.set(Bool(true));
    this.won.set(Bool(false));
    this.drawn.set(Bool(false));
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
    this.won.getAndRequireEquals().assertFalse()

    // AFAICT it's not easy to do 2^n in a proof?
    // when n is only known at runtime
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
    const newWon = winClaim.equals(0).not();
    this.won.set(newWon);
    this.drawn.set(xsNew.add(osNew).equals(0b111111111).and(newWon.not()));
  }
}

const row = 0b111;
const col = 0b1001001;
const win_numbers =
  [ Field(row) , Field(row << 3) , Field(row << 6)
  , Field(col) , Field(col << 1) , Field(col << 2)
  , Field(0b100010001) , Field(0b001010100) // Diagonals
  ]


export class TTTState extends Struct({
  xs : Field ,
  os :Field ,
  won : Bool ,
  drawn : Bool ,
  turn : Bool
}){
};

export const start : TTTState =
  { xs : Field(0) , os  : Field(0)
  , won : Bool(false) , drawn : Bool(false)
  , turn : Bool(true)
  };

export const TTTRec = ZkProgram({
  name: 'TTT recursive',
  publicInput: TTTState,
  methods: {
    init : {
      privateInputs : [],
      async method(state : TTTState) {
        state.xs.assertEquals(Field(0),"bad start xs");
        state.os.assertEquals(Field(0),"bad start os");
        state.turn.assertEquals(Bool(true),"bad start turn");
        state.won.assertEquals(Bool(false),"bad start won");
        state.drawn.assertEquals(Bool(false),"bad start drawn");
      }
    },

    move : {
      privateInputs : [ SelfProof , Field , Field ],
      async method(
        outState: TTTState,
        inState : SelfProof<TTTState,void> ,
        move :Field ,
        winClaim : Field)
      {


        inState.verify();

        // No need to check for drawn because drawn games have no valid moves
        inState.publicInput.won.assertFalse();


        // Check move is valid power of 2
        move.assertNotEquals(0,"move was zero");
        assert(move.lessThanOrEqual(1 << 9),"2^n check 1");
        // Check for ones distance one appart
        const move_l1 = Gadgets.leftShift32(move,1);
        assert(Gadgets.and(move_l1,move,10).equals(0),"2^n check 2");
        //Check for ones distance 2 or 3 appart
        const move_c2 = Gadgets.xor(move,move_l1,10);
        const move_l2 = Gadgets.leftShift32(move_c2,2);
        assert(Gadgets.and(move_l2,move_c2,11).equals(0),"2^n check 3");
        //Check for ones distance 4-7 appart
        const move_c4 = Gadgets.xor(move,move_l2,14);
        const move_l4 = Gadgets.leftShift32(move_c4,4);
        assert(Gadgets.and(move_l4,move_c4,14).equals(0),"2^n check 4");
        // The only way to have distance 8 is 257
        move.assertNotEquals(257,"2^n check 5");

        const turn = inState.publicInput.turn.toField();
        const xs = inState.publicInput.xs;
        const os = inState.publicInput.os;

        Gadgets.and(xs.add(os),move,9).assertEquals(0,"square taken")

        /// check turn is switcched
        outState.turn.assertEquals(inState.publicInput.turn.not(),"turn not switched");
        // Check move applied correcty
        outState.xs.assertEquals(xs.add(move.mul(turn)),"xs wrong");
        outState.os.assertEquals(os.add(move.mul(outState.turn.toField())),"os wrong");

        // Check If a win is claimed it's valid
        const validWinNumber = win_numbers.map(n => winClaim.equals(n)).reduce((a,b) => a.or(b),Bool(false));
        const winnerBoard = outState.xs.mul(turn).add(outState.os.mul(outState.turn.toField()));
        const boardSupportsWin = Gadgets.and(winnerBoard,winClaim,9).equals(winClaim);
        assert((validWinNumber.and(boardSupportsWin)).or(winClaim.equals(0)),"bad win claim");
        // check out state doesn't reflect unclaimed win
        assert(outState.won.and(winClaim.equals(0)).not(),"marked won without win claim");

        // check draw declared iff drawn
        outState.drawn.assertEquals(outState.xs.add(outState.os).equals(0b111111111),"draw was wrong");
      },
    }
  },
})

export async function moveRec(inputGame : Proof<TTTState,void>, move : number) : Promise<Proof<TTTState,void>> {
  let move_val = Field(1 << move);
  let win = Field(0);
  let outputGame =
    { xs : Field(0) , os  : Field(0)
    , won : Bool(false) , drawn : Bool(false)
    , turn : Bool(true)
    };

  if(inputGame.publicInput.turn.toBoolean()){
    outputGame.xs = inputGame.publicInput.xs.add(move_val);
    outputGame.os = inputGame.publicInput.os;
  }else{
    outputGame.os = inputGame.publicInput.os.add(move_val);
    outputGame.xs = inputGame.publicInput.xs;
  }

  outputGame.turn = inputGame.publicInput.turn.not();

  for(let n of win_numbers){
    if(inputGame.publicInput.turn.toBoolean()) {
      if(Gadgets.and(outputGame.xs,n,9).equals(n).toBoolean()) {
        win = n;
        outputGame.won = Bool(true);
      }
    } else {
      if(Gadgets.and(outputGame.os,n,9).equals(n).toBoolean()) {
        win = n;
        outputGame.won = Bool(true);
      }
    }
  }
  // TODO make the 0b111111111 a constant somewhere
  if( win == Field(0) && outputGame.xs.add(outputGame.os).equals(Field(0b111111111))) {
    outputGame.drawn = Bool(true);
  }
  return await TTTRec.move(outputGame,inputGame,move_val,win);
}
