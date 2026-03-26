import AthletePortalLayout from "@/components/athlete/AthletePortalLayout";
import { TimelineFeed } from "@/components/timeline/TimelineFeed";

const AthleteTimeline = () => {
  return (
    <AthletePortalLayout title="Timeline" fullHeight>
      <TimelineFeed />
    </AthletePortalLayout>
  );
};

export default AthleteTimeline;
