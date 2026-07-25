import type { User } from "firebase/auth";
import { FiBookOpen, FiCloud, FiLogOut, FiMoon, FiStar } from "react-icons/fi";
import { NavLink } from "react-router-dom";
import getStyle from "../../styles/getStyle";

export function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark"><FiMoon /></span>
      <span>Recall</span>
    </div>
  );
}

export function CloudBackdrop() {
  return (
    <div className="clouds" aria-hidden="true">
      <span className="cloud cloud-one" />
      <span className="cloud cloud-two" />
      <span className="cloud cloud-three" />
      <FiCloud className={getStyle(styles, "cloudIconOne")} />
      <FiCloud className={getStyle(styles, "cloudIconTwo")} />
      <FiCloud className={getStyle(styles, "cloudIconThree")} />
      <FiCloud className={getStyle(styles, "cloudIconFour")} />
      <FiCloud className={getStyle(styles, "cloudIconFive")} />
      <FiCloud className={getStyle(styles, "cloudIconSix")} />
    </div>
  );
}

export function AppHeader({ user, onSignOut }: { user: User; onSignOut: () => Promise<void> }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const accountName = user.displayName?.trim() || user.email?.split("@")[0] || "";
  const firstName = accountName.split(/\s+/)[0];
  const profileInitial = (accountName || "R").charAt(0).toUpperCase();

  return (
    <header className="topbar">
      <Brand />
      <nav aria-label="Primary navigation">
        <NavLink to="/journal"><FiBookOpen /> Journal</NavLink>
        <NavLink to="/patterns"><FiStar /> Patterns</NavLink>
      </nav>
      <div className={getStyle(styles, "profile")}>
        <span className={getStyle(styles, "avatar")}>
          {user.photoURL
            ? <img className={getStyle(styles, "avatarImage")} src={user.photoURL} alt="" referrerPolicy="no-referrer" />
            : profileInitial}
        </span>
        <span className={getStyle(styles, "profileCopy")}>
          <strong>{greeting}</strong>
          {firstName && <small className={getStyle(styles, "profileName")}>{firstName}</small>}
        </span>
        <button className="icon-button" onClick={onSignOut} aria-label="Sign out"><FiLogOut /></button>
      </div>
    </header>
  );
}

const styles = {
  cloudIconOne: [
    "fixed", "right-[2%]", "top-[18%]", "h-9", "w-9", "text-[#8f91ae]/15",
    "animate-[cloudDrift_11s_ease-in-out_infinite]",
    "max-[760px]:right-3", "max-[760px]:top-[15%]", "max-[760px]:h-7",
    "max-[760px]:w-7", "max-[760px]:text-[#8f91ae]/10",
  ],
  cloudIconTwo: [
    "fixed", "left-[1.5%]", "top-[52%]", "h-8", "w-8", "text-[#8f91ae]/10",
    "animate-[cloudDrift_15s_ease-in-out_infinite_reverse]",
    "max-[760px]:left-2", "max-[760px]:top-[58%]", "max-[760px]:h-6", "max-[760px]:w-6",
  ],
  cloudIconThree: [
    "fixed", "bottom-[10%]", "right-[2.5%]", "h-7", "w-7", "text-[#8f91ae]/10",
    "animate-[cloudDrift_13s_ease-in-out_infinite]", "max-[760px]:hidden",
  ],
  cloudIconFour: [
    "fixed", "left-[14%]", "top-[14%]", "h-6", "w-6", "text-[#8f91ae]/10",
    "animate-[cloudDrift_17s_ease-in-out_infinite_reverse]", "max-[760px]:hidden",
  ],
  cloudIconFive: [
    "fixed", "right-[17%]", "top-[61%]", "h-8", "w-8", "text-[#8f91ae]/10",
    "animate-[cloudDrift_14s_ease-in-out_infinite]",
    "max-[760px]:right-2", "max-[760px]:top-[72%]", "max-[760px]:h-6",
    "max-[760px]:w-6", "max-[760px]:text-[#8f91ae]/8",
  ],
  cloudIconSix: [
    "fixed", "bottom-[13%]", "left-[8%]", "h-7", "w-7", "text-[#8f91ae]/10",
    "animate-[cloudDrift_19s_ease-in-out_infinite_reverse]", "max-[760px]:hidden",
  ],
  profile: ["flex", "items-center", "gap-2.5"],
  avatar: [
    "grid", "h-9", "w-9", "shrink-0", "place-items-center", "overflow-hidden",
    "rounded-full", "bg-[#f3d8c8]", "font-serif", "text-[#4a4c76]", "ring-2", "ring-white/70",
  ],
  avatarImage: ["block", "h-full", "w-full", "object-cover"],
  profileCopy: ["flex", "flex-col", "whitespace-nowrap", "text-xs", "leading-tight", "max-[980px]:hidden"],
  profileName: ["mt-1", "text-[#73768b]"],
};
