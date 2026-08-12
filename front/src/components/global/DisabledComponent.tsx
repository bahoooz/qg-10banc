import { motion } from "framer-motion";

export default function DisabledComponent() {
  return (
    <div className="h-screen flex flex-col gap-16 justify-center items-center">
      <h2 className="text-xl text-center">Cette page est en cours de développement...</h2>
      <motion.img
        src="/assets/logo/logo-header.png"
        alt="logo"
        width={256}
        height={256}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{
          scale: [1, 1.15, 1],
          y: [0, -10, 0],
          opacity: 1,
        }}
        transition={{
          scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
          y: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
          opacity: { duration: 0.5 },
        }}
        className="relative z-10 w-32 h-32"
      />
    </div>
  );
}
