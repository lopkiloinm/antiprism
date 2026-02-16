import ProjectPageClient from "./ProjectPageClient";

export function generateStaticParams() {
  return [{ id: "new" }];
}

export default function ProjectPage() {
  return <ProjectPageClient />;
}
