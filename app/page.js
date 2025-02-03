import Image from "next/image";
import styles from "./page.module.css";
import ImporterApp from './components/index'

export default function Home() {
  return (
    <div className={styles.page}>
      <ImporterApp />
    </div>
  );
}
