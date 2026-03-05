export interface QuotationTemplate {
  id: string;
  name: string;
  category: 'software' | 'wordpress' | 'mobile';
  tos: string;
  paymentTerms: string;
  refundPolicy: string;
  terminationPolicy: string;
}

export const QUOTATION_TEMPLATES: QuotationTemplate[] = [
  {
    id: 'software-dev',
    name: 'Software Development',
    category: 'software',
    tos: `
      <h2>1. Scope of Services</h2>
      <p>The Company will provide software development services as outlined in the project proposal. Any changes to the scope must be agreed upon in writing.</p>
      <h2>2. Intellectual Property</h2>
      <p>Upon full payment, all custom-developed source code and intellectual property rights will be transferred to the Client. The Company retains the right to use generic libraries and tools developed prior to or during the project.</p>
      <h2>3. Confidentiality</h2>
      <p>Both parties agree to keep all project-related information, business data, and trade secrets strictly confidential during and after the project.</p>
      <h2>4. Warranty & Support</h2>
      <p>A 30-day bug-fix warranty is provided after the final delivery. Extended maintenance and support agreements are available separately.</p>
    `,
    paymentTerms: `
      <p><strong>Standard Development Schedule:</strong></p>
      <ul>
        <li><strong>40% Advance:</strong> Project kick-off and requirement finalization.</li>
        <li><strong>40% Milestone:</strong> Completion of core development and beta release.</li>
        <li><strong>20% Final:</strong> Deployment, hand-over, and final sign-off.</li>
      </ul>
      <p><em>Invoices are payable within 7 days of receipt.</em></p>
    `,
    refundPolicy: `
      <p>Payments made for work completed and milestones approved are non-refundable. If the project is cancelled before the first milestone, a partial refund of the advance may be provided, minus direct costs incurred.</p>
    `,
    terminationPolicy: `
      <p>Either party may terminate the agreement with 15 days' written notice. Upon termination, the Client will be liable for payment for all work completed up to the termination date, and the Company will deliver all work-in-progress to the Client.</p>
    `,
  },
  {
    id: 'wordpress-web',
    name: 'WordPress Website',
    category: 'wordpress',
    tos: `
      <h2>1. Website Development</h2>
      <p>Development includes theme customization, plugin integration, and content population as specified in the proposal.</p>
      <h2>2. Content & Media</h2>
      <p>The Client is responsible for providing all text content, images, and brand assets. The Company is not responsible for copyright issues related to client-provided media.</p>
      <h2>3. Third-Party Licenses</h2>
      <p>The Client is responsible for any recurring costs related to premium plugins, themes, or hosting services unless explicitly included in the contract.</p>
      <h2>4. Browser Compatibility</h2>
      <p>The website will be optimized for the latest versions of Chrome, Safari, Firefox, and Edge.</p>
    `,
    paymentTerms: `
      <p><strong>Web Project Schedule:</strong></p>
      <ul>
        <li><strong>50% Deposit:</strong> Required to begin design and procurement.</li>
        <li><strong>50% Completion:</strong> Payable before the website goes live on the production server.</li>
      </ul>
    `,
    refundPolicy: `
      <p>The 50% deposit is non-refundable once the design phase has commenced. No refunds will be issued once the website has been deployed to a staging or production server.</p>
    `,
    terminationPolicy: `
      <p>If the project is cancelled by the Client, the Company retains the deposit. If cancelled by the Company, a pro-rated refund will be provided based on incomplete deliverables.</p>
    `,
  },
  {
    id: 'mobile-app',
    name: 'Mobile App (iOS/Android)',
    category: 'mobile',
    tos: `
      <h2>1. App Development</h2>
      <p>Cross-platform or native development as per the technical specifications. Includes UI/UX design and API integration.</p>
      <h2>2. App Store Submission</h2>
      <p>The Company will assist with submitting the app to the Apple App Store and Google Play Store. Approval is subject to store policies and is not guaranteed by the Company.</p>
      <h2>3. Third-Party Services</h2>
      <p>Costs for Firebase, AWS, Google Maps API, etc., are the responsibility of the Client.</p>
      <h2>4. Maintenance</h2>
      <p>Ongoing maintenance is recommended to ensure compatibility with new OS updates (iOS/Android).</p>
    `,
    paymentTerms: `
      <p><strong>Mobile Development Schedule:</strong></p>
      <ul>
        <li><strong>30% Initiation:</strong> Design phase and architecture setup.</li>
        <li><strong>30% Development:</strong> Alpha version release for internal testing.</li>
        <li><strong>40% Launch:</strong> Successful production release.</li>
      </ul>
    `,
    refundPolicy: `
      <p>Due to the complexity of mobile development and store submission processes, all payments are non-refundable once each milestone phase begins.</p>
    `,
    terminationPolicy: `
      <p>Projects may be terminated with 30 days' notice. Technical documentation and source code will be provided only for milestones fully paid for by the Client.</p>
    `,
  },
];

export const DEFAULT_TOS = QUOTATION_TEMPLATES[0].tos;
export const DEFAULT_PAYMENT_TERMS = QUOTATION_TEMPLATES[0].paymentTerms;
export const DEFAULT_REFUND_POLICY = QUOTATION_TEMPLATES[0].refundPolicy;
export const DEFAULT_TERMINATION_POLICY = QUOTATION_TEMPLATES[0].terminationPolicy;
