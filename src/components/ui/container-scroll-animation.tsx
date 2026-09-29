"use client";

import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useRef, useSyncExternalStore, type ReactNode } from "react";

// Adapted from Aceternity UI's ContainerScroll.

const MOBILE_QUERY = "(max-width: 768px)";

function subscribeMobile(onChange: () => void) {
  const mq = window.matchMedia(MOBILE_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

const isMobileNow = () => window.matchMedia(MOBILE_QUERY).matches;
const isMobileOnServer = () => false;

export const ContainerScroll = ({ titleComponent, children }: { titleComponent: string | ReactNode; children: ReactNode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const isMobile = useSyncExternalStore(subscribeMobile, isMobileNow, isMobileOnServer);

  const rotate = useTransform(scrollYProgress, [0, 1], [20, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], isMobile ? [0.7, 0.9] : [1.05, 1]);
  const translate = useTransform(scrollYProgress, [0, 1], [0, -100]);

  return (
    <div className="relative flex h-[60rem] items-center justify-center p-2 md:h-[80rem] md:p-20" ref={containerRef}>
      <div className="relative w-full py-10 md:py-40" style={{ perspective: "1000px" }}>
        <Header translate={translate} titleComponent={titleComponent} />
        <Card rotate={rotate} translate={translate} scale={scale}>
          {children}
        </Card>
      </div>
    </div>
  );
};

export const Header = ({ translate, titleComponent }: { translate: MotionValue<number>; titleComponent: string | ReactNode }) => {
  return (
    <motion.div style={{ translateY: translate }} className="mx-auto max-w-5xl text-center">
      {titleComponent}
    </motion.div>
  );
};

export const Card = ({
  rotate,
  scale,
  children,
}: {
  rotate: MotionValue<number>;
  scale: MotionValue<number>;
  translate: MotionValue<number>;
  children: ReactNode;
}) => {
  return (
    <motion.div
      style={{
        rotateX: rotate,
        scale,
        boxShadow:
          "0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a, 0 233px 65px #00000003",
      }}
      className="mx-auto -mt-12 h-[30rem] w-full max-w-5xl rounded-[30px] border-4 border-[#44464f] bg-[#1e1f25] p-2 shadow-2xl md:h-[40rem] md:p-6"
    >
      <div className="relative h-full w-full overflow-hidden rounded-2xl bg-surface-container md:rounded-2xl">{children}</div>
    </motion.div>
  );
};
