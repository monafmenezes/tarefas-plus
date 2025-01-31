import { HTMLProps } from "react";
import styles from "./styles.module.css";


export function Textarea({...rest}: HTMLProps<HTMLTextAreaElement>) {
    return <textarea {...rest} className={styles.textarea}></textarea>;
}