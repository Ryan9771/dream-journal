import getStyle from "../../util/Styles";
import { SignupButton } from "./Buttons";
import { useState } from "react";
import { post } from "../../util/util";
import { getLogin } from "../../services/Services";

interface Props {
  signupFunc: () => void;
}

// TODO: Add or make by regex a validation for email and password

function LoginPanel({ signupFunc }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  /* Logs the user in and should redirect to journal page 
    in Authoristion component as it watches changes in Auth state */
  const login = async () => {
    try {
      await getLogin(username, password);
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className={getStyle(styles, "ctn")}>
      <div className={getStyle(styles, "loginCtn")}>
        <div className={getStyle(styles, "heading")}>Login</div>
        <input
          type="email"
          className={getStyle(styles, "textfields")}
          placeholder="Email"
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          className={getStyle(styles, "textfields")}
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
        />
        <div onClick={login} className={getStyle(styles, "continueBtn")}>
          continue
        </div>
      </div>
      <div className={getStyle(styles, "signinBtnCtn")}>
        <SignupButton onClick={() => signupFunc()} />
      </div>
    </div>
  );
}

const styles = {
  ctn: [
    "bg-peach",
    "w-64",
    "p-7",
    "flex",
    "flex-col",
    "items-center",
    "rounded-lg",
    "shadow-md",
    "lg:w-80",
  ],
  heading: ["text-xl", "text-blue-2"],
  textfields: [
    "w-full",
    "text-blue-2",
    "rounded-lg",
    "px-4",
    "py-2",
    "flex",
    "items-center",
    "focus:outline-none",
    // "lg:py-2",
  ],
  loginCtn: [
    "flex",
    "flex-col",
    "w-full",
    "gap-4",
    "items-center",
    "border-b",
    "border-b-blue-2",
    "pb-2",
  ],
  continueBtn: [
    "flex",
    "items-center",
    "gap-2",
    "text-blue-2",
    "text-center",
    "cursor-pointer",
    "hover:font-semibold",
  ],
  signinBtnCtn: ["w-full", "pt-5", "lg:pt-7"],
  continueBtnIcon: ["fill-blue-2", "w-4"],
};

export default LoginPanel;
