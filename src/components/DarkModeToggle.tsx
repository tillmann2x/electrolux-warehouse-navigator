import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sun, Moon } from "lucide-react";

export function DarkModeToggle() {
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("slds-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("slds-theme", "light");
    }
  }, [dark]);

  useEffect(() => {
    const saved = localStorage.getItem("slds-theme");
    if (saved === "dark") {
      setDark(true);
    }
  }, []);

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={() => setDark(!dark)}
      className="p-2 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors"
      title={dark ? "Modo Claro" : "Modo Escuro"}
    >
      {dark ? (
        <Sun className="h-4 w-4 text-primary-foreground" />
      ) : (
        <Moon className="h-4 w-4 text-primary-foreground" />
      )}
    </motion.button>
  );
}
