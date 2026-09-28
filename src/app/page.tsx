import IntroExperience from "@/components/intro/IntroExperience";
import { AboutSection, ContactSection, ExperienceSection, LabSection, WorkSection } from "@/components/HomeSections";

export default function Home() {
  return (
    <>
      <IntroExperience />
      <main id="main" className="content-over">
        <WorkSection />
        <LabSection />
        <ExperienceSection />
        <AboutSection />
        <ContactSection />
      </main>
    </>
  );
}
