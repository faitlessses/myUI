import {
  IconRocket,
  IconHeartbeat,
  IconChartHistogram,
  IconCloudShare
} from "@tabler/icons-react";
import { motion } from "framer-motion";

const innovations = [
  {
    title: "Persona Blend Engine",
    description:
      "Fuse brand tone with cinematic archetypes and instantly preview carton covers vs motion teasers.",
    icon: IconRocket,
    accent: "text-neon-cyan"
  },
  {
    title: "Audience Pulse",
    description: "Live sentiment overlay syncs social reactions with training checkpoints to pre-score narratives.",
    icon: IconHeartbeat,
    accent: "text-neon-pink"
  },
  {
    title: "Metric Hologram",
    description: "Spatialize performance metrics into AR-friendly grids for executive readouts in seconds.",
    icon: IconChartHistogram,
    accent: "text-neon-lime"
  },
  {
    title: "Cloudburst Render",
    description: "Spin up ephemeral inference shards to test LoRA merges across packaging SKUs instantly.",
    icon: IconCloudShare,
    accent: "text-neon-cyan"
  }
];

export function InnovationHub() {
  return (
    <section className="glass-panel relative overflow-hidden rounded-3xl p-6">
      <div className="grid-overlay" />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Signature Features</p>
          <h2 className="mt-2 text-lg font-semibold">Unique to Flux & Wan Forge</h2>
        </div>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {innovations.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              whileHover={{ y: -4 }}
              className="rounded-3xl border border-white/10 bg-white/5 p-5"
            >
              <div className="flex items-center gap-3">
                <span className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 ${item.accent}`}>
                  <Icon size={18} />
                </span>
                <p className="text-sm font-semibold text-white">{item.title}</p>
              </div>
              <p className="mt-3 text-xs text-white/60">{item.description}</p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
