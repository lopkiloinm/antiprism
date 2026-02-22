import ProjectPageClient from "./ProjectPageClient";

export function generateStaticParams() {
  // Generate some common project IDs to reduce 404s for known patterns
  const commonIds = ["new"];
  
  // In production, we could generate IDs from localStorage or other sources
  // For now, just return the placeholder
  return commonIds.map(id => ({ id }));
}

export default function ProjectPage() {
  return <ProjectPageClient />;
}
