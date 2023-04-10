import GeneralProgramError from "tests/constants/GeneralProgramError";
import ProgramErrorName from "tests/constants/ProgramErrorName";

type ProgramTransactionError = GeneralProgramError | ProgramErrorName;

export default ProgramTransactionError;
