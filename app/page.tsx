import Hero from "./components/Hero";
import ImageGrid from "./components/ImageGrid";
import Header from "./components/Header";
import { getWebsiteInfo } from "@/lib/website-info";

export default async function Home() {
  const websiteInfo = await getWebsiteInfo();

  return (
    <main className="min-h-screen bg-background">
      <Header siteName={websiteInfo.websiteName} showOnScrollOnly={true} />
      <Hero />
      <ImageGrid />
    </main>
  );
}
