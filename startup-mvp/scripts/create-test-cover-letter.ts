import { createCoverLetter } from './app/(dashboard)/dashboard/settings/_actions/coverLetter.action';

async function main() {
  const result = await createCoverLetter({
    title: "Standard Cover Letter",
    content: "Dear [Client Name],\n\nWe are pleased to present this quotation for [Project Name]. Our team has carefully reviewed your requirements and prepared a comprehensive proposal that aligns with your vision.\n\nThank you for considering us.",
    status: "active"
  });
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
