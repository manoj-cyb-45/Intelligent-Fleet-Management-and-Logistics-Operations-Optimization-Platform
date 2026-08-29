import { motion } from "framer-motion";

export default function StatCard({
  title,
  value,
  icon: Icon,
  color,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{
        scale: 1.04,
        y: -10,
      }}
      transition={{ duration: 0.25 }}
      className="group relative overflow-hidden rounded-[28px] border border-blue-500/20 bg-gradient-to-br from-[#05070D] via-[#0A0D15] to-black p-6 shadow-[0_0_20px_rgba(37,99,235,.15)] hover:border-blue-400 hover:shadow-[0_0_45px_rgba(37,99,235,.45)]"
    >
      {/* Top Neon Line */}
      <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-400" />

      {/* Animated Glow */}
      <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-blue-600/10 blur-3xl transition-all duration-500 group-hover:bg-blue-500/30" />

      {/* HUD Grid */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[linear-gradient(rgba(255,255,255,.15)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.15)_1px,transparent_1px)] bg-[size:28px_28px]" />

      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[3px] text-zinc-400 font-semibold">
            {title}
          </p>

          <motion.h3
            key={value}
            initial={{ scale: 0.85 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.2 }}
            className="mt-4 text-6xl font-black text-white"
          >
            {value}
          </motion.h3>

          <div className="mt-3 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs uppercase tracking-wider text-zinc-500">
              LIVE DATA
            </span>
          </div>
        </div>

        <motion.div
          whileHover={{ rotate: 10, scale: 1.2 }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl bg-zinc-900/60 p-4 border border-zinc-800"
        >
          <Icon
            className={`${color} drop-shadow-[0_0_18px_rgba(59,130,246,.8)]`}
            size={42}
          />
        </motion.div>
      </div>

      {/* Bottom Progress */}
      <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ duration: 1.2 }}
          className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500"
        />
      </div>

      {/* Scan Effect */}
      <motion.div
        initial={{ x: "-120%" }}
        whileHover={{ x: "220%" }}
        transition={{ duration: 0.8 }}
        className="absolute inset-y-0 w-20 rotate-12 bg-gradient-to-r from-transparent via-white/10 to-transparent"
      />
    </motion.div>
  );
}