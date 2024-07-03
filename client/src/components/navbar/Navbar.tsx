import getStyle from "../../util/Styles";
import { FaQuoteRight } from "react-icons/fa6";
import { IoLogOut } from "react-icons/io5";
import { useNavigate } from "react-router-dom";

// TODO: Probably some page state management or something
//  to highlight the current icon in the navbar depending on the page

function Navbar() {
  const navigate = useNavigate();

  const logOutHandler = () => {
    localStorage.removeItem("access_token");
    navigate("/");
  };

  return (
    <div className={getStyle(styles, "ctn")}>
      <FaQuoteRight className="w-[22px] h-[22px] fill-peach cursor-pointer" />
      <IoLogOut
        onClick={logOutHandler}
        className="w-[22px] h-[22px] fill-peach cursor-pointer"
      />
    </div>
  );
}

const styles = {
  ctn: [
    "flex",
    "px-6",
    "justify-between",
    "items-center",
    "bg-blue-1",
    "pt-5",
    "fixed",
    "top-0",
    "left-0",
    "right-0",
    "z-50",
  ],
};

export default Navbar;
