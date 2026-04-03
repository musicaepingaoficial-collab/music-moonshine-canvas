import { motion } from "framer-motion";

interface BannerProps {
  title: string;
  subtitle?: string;
  gradient?: boolean;
}

export function Banner({ title, subtitle, gradient = true }: BannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`relative overflow-hidden rounded-2xl p-8 md:p-12 ${
        gradient
          ? "bg-gradient-to-br from-primary/30 via-primary/10 to-transparent"
          : "bg-card"
      }`}
    >
      <div className="relative z-10">
        <h1 className="text-2xl font-bold text-foreground md:text-4xl">{title}</h1>
        {subtitle && (
          <p className="mt-2 max-w-lg text-sm text-muted-foreground md:text-base">
            {subtitle}
          </p>
        )}
      </div>
      {gradient && (
        <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-primary/10 blur-3xl" />
      )}
    </motion.div>
  );
}
