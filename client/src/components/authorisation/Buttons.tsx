import getStyle from "../../util/Styles";

const styles = {
  loginBtn: [
    "bg-green-1",
    "w-full",
    "text-white",
    "rounded-lg",
    "px-4",
    "py-[6px]",
    "flex",
    "items-center",
    "cursor-pointer",
    "select-none",
    "hover:bg-green-2",
    "lg:py-2",
  ],
  signupBtn: [
    "bg-blue-2",
    "w-full",
    "text-white",
    "rounded-lg",
    "px-4",
    "py-[6px]",
    "flex",
    "items-center",
    "cursor-pointer",
    "select-none",
    "hover:bg-blue-3",
    "lg:py-2",
  ],
  txt: ["text-center", "w-full"],
};

export const LoginButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <div className={getStyle(styles, "loginBtn")} onClick={() => onClick()}>
      <div className={getStyle(styles, "txt")}>Login</div>
    </div>
  );
};

export const SignupButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <div className={getStyle(styles, "signupBtn")} onClick={() => onClick()}>
      <div className={getStyle(styles, "txt")}>Signup</div>
    </div>
  );
};
