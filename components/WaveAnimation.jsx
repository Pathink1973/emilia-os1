import { motion } from "framer-motion";

const WaveAnimation = () => {
  return (
    <div className="wave-container">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="wave-bar"
          animate={{
            y: [0, -10, 0],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  );
};

export default WaveAnimation;
