import AthletePortalLayout from "@/components/athlete/AthletePortalLayout";
import { TimelineFeed } from "@/components/timeline/TimelineFeed";
import { useLanguage } from "@/contexts/LanguageContext";

const AthleteTimeline = () => {
  const { t } = useLanguage();
  return (
    <AthletePortalLayout title={t.athlete.nav.timeline} fullHeight>
      <TimelineFeed />
    </AthletePortalLayout>
  );
};

export default AthleteTimeline;
