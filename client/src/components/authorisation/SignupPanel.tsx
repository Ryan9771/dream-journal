import getStyle from "../../util/Styles";
import { LoginButton } from "./Buttons";
import { useState } from "react";
import { post } from "../../util/util";

// TODO: Add or make by regex a validation for email and password

interface Props {
  loginFunc: () => void;
}

function SignupPanel({ loginFunc }: Props) {
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupRePassword, setSignupRePassword] = useState("");

  const signup = async () => {
    try {
      const response = await post("/signup", {
        username: signupEmail,
        password: signupPassword,
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("access_token", data.access_token);
        alert("Signed up!");
      } else {
        alert("User already exists");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleSignup = () => {
    if (signupPassword === signupRePassword) {
      signup();
    } else {
      setSignupPassword("");
      setSignupRePassword("");
      alert("Passwords do not match");
    }
  };

  return (
    <div className={getStyle(styles, "ctn")}>
      <div className={getStyle(styles, "loginBtnCtn")}>
        <LoginButton onClick={() => loginFunc()} />
      </div>
      <div className={getStyle(styles, "signupCtn")}>
        <div className={getStyle(styles, "heading")}>Signup</div>
        <input
          type="email"
          className={getStyle(styles, "textfields")}
          placeholder="Email"
          onChange={(e) => setSignupEmail(e.target.value)}
        />
        <input
          type="password"
          className={getStyle(styles, "textfields")}
          placeholder="Password"
          onChange={(e) => setSignupPassword(e.target.value)}
        />
        <input
          type="password"
          className={getStyle(styles, "textfields")}
          placeholder="Re-enter Password"
          onChange={(e) => setSignupRePassword(e.target.value)}
        />
        <div onClick={handleSignup} className={getStyle(styles, "continueBtn")}>
          continue
        </div>
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
  heading: ["text-lg", "lg:text-xl", "text-blue-2"],
  textfields: [
    "w-full",
    "text-blue-2",
    "rounded-lg",
    "px-4",
    "py-2",
    "flex",
    "items-center",
    "focus:outline-none",
  ],
  loginBtnCtn: ["w-full", "pb-5", "border-b", "border-b-blue-2", "lg:pb-7"],
  signupCtn: ["flex", "flex-col", "w-full", "gap-4", "items-center", "pt-3"],
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

export default SignupPanel;
