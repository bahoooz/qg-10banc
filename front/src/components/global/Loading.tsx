import { motion } from "framer-motion";

export default function Loading() {
  return (
    <div className="fixed h-full w-full left-0 top-0 flex items-center justify-center z-50 bg-background">
      <div className="relative flex flex-col items-center">
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
          className="relative z-10"
        />
        <p className="text-xl absolute -bottom-32">Chargement...</p>
      </div>
    </div>
  );
}
