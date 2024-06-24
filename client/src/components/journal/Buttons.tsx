import getStyle from "../../util/Styles";
import { IoIosSave } from "react-icons/io";
import { RxCross2 } from "react-icons/rx";
import { GiBrain } from "react-icons/gi";

const styles = {
    analyseBtn: [
        "bg-blue-1",
        "text-white",
        "rounded-lg",
        "tracking-tighter",
        "gap-2.5",
        "px-4",
        "py-[6px]",
        "flex",
        "items-center",
        "cursor-pointer",
        "hover:bg-blue-2",
        "select-none",
    ],
    buttonGeneral: [
        "flex",
        "text-white",
        "gap-2.5",
        "justify-center",
        "items-center",
        "rounded-lg",
        "cursor-pointer",
        "px-2",
        "py-1.5",
        "select-none"
    ],
    saveBtn: [
        "bg-green-1",
        "hover:bg-green-2"
    ],
    doneBtn: [
        "bg-blue-1",
        "hover:bg-blue-2",
    ],
    icon: [
        "fill-white",
        "w-6",
        "h-6"
    ],
}

export const SaveButton = ({ onClick }: { onClick: () => void }) => {
    return (
        <div 
            className={getStyle(styles, "buttonGeneral") + getStyle(styles, "saveBtn")}
            onClick={() => onClick()}
        >
            <IoIosSave className={getStyle(styles, "icon")} />
            <div>Save</div>
        </div>
    );
}

export const DoneButton = ({ onClick }: { onClick: () => void }) => {
    return (
        <div 
            className={getStyle(styles, "buttonGeneral") + getStyle(styles, "doneBtn")}
            onClick={() => onClick()}
        >
            <RxCross2 className={getStyle(styles, "icon")} />
            <div>Done</div>
        </div>
    );
}

export const AnalyseButton = ({ onClick }: { onClick: () => void }) => {
    return (
        <div 
            className={getStyle(styles, "buttonGeneral") + getStyle(styles, "analyseBtn")}
            onClick={() => onClick()}
        >
            <GiBrain className={getStyle(styles, "icon")} />
            <div>Analyse today's entry</div>
        </div>
    );
}


