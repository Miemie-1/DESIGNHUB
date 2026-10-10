const Client = require('./models/Client');
const Project = require('./models/Project');
const Payment = require('./models/Payment');

const d = (s) => new Date(`${s}T09:00:00.000Z`);

// Sample data for the shared demo account ("Continue as demo" on the login page).
async function seedDemo(userId) {
  const mk = (name, email, phone, status = 'active') => ({
    user: userId,
    name,
    email,
    phone,
    businessName: name,
    address: 'Lagos, Nigeria',
    status,
  });

  const [apex, chioma, lagosBites, nexa, adeola, greenspace, midas] = await Client.insertMany([
    mk('Apex Foods', 'hello@apexfoods.com', '+234 803 000 0000'),
    mk('Chioma Events', 'chioma@events.com', '+234 805 111 2222'),
    mk('Lagos Bites', 'info@lagosbites.com', '+234 802 333 4444'),
    mk('Nexa Consult', 'admin@nexaconsult.com', '+234 809 555 6666', 'inactive'),
    mk('Adeola Couture', 'adeola@couture.com', '+234 810 777 8888'),
    mk('GreenSpace Ltd', 'hello@greenspace.com', '+234 807 999 0000'),
    mk('Midas Academy', 'contact@midas.edu', '+234 806 121 3434'),
  ]);

  const p = (client, name, type, amount, status, progress, start, deadline, extra = {}) => ({
    user: userId, client: client._id, name, type, amount, status, progress,
    startDate: d(start), deadline: d(deadline), ...extra,
  });

  const [brand, social, card, banner, flyer, profile, logo, catalogue] = await Project.insertMany([
    p(apex, 'Brand Identity', 'Branding', 120000, 'in-progress', 65, '2026-10-01', '2026-10-10', {
      description:
        'Complete visual identity for Apex Foods including logo, color palette, typography and brand guidelines.',
      deliverables: ['Logo concepts', 'Brand color palette', 'Typography guide', 'Final brand guideline'],
    }),
    p(apex, 'Social Media Kit', 'Social media', 80000, 'completed', 100, '2026-09-05', '2026-09-22'),
    p(apex, 'Business Card', 'Print', 35000, 'completed', 100, '2026-08-15', '2026-08-30'),
    p(chioma, 'Event Banner', 'Print', 40000, 'completed', 100, '2026-09-25', '2026-10-05'),
    p(lagosBites, 'Event Flyer', 'Flyer', 45000, 'completed', 100, '2026-09-20', '2026-10-02'),
    p(nexa, 'Company Profile', 'Document', 75000, 'review', 90, '2026-09-10', '2026-09-29'),
    p(adeola, 'Logo Design', 'Logo', 65000, 'completed', 100, '2026-09-12', '2026-09-25'),
    p(greenspace, 'Catalogue', 'Print', 55000, 'completed', 100, '2026-09-01', '2026-09-20'),
  ]);

  await Payment.insertMany([
    { project: brand, amount: 70000, paymentDate: d('2026-10-07'), method: 'Bank Transfer', reference: 'TRX-000123', status: 'partial' },
    { project: social, amount: 80000, paymentDate: d('2026-09-22'), method: 'Bank Transfer', reference: 'TRX-000098', status: 'paid' },
    { project: card, amount: 35000, paymentDate: d('2026-08-30'), method: 'Cash', status: 'paid' },
    { project: banner, amount: 40000, paymentDate: d('2026-10-05'), method: 'Bank Transfer', reference: 'TRX-000120', status: 'paid' },
    { project: flyer, amount: 45000, paymentDate: d('2026-10-02'), method: 'Cash', status: 'paid' },
    { project: profile, amount: 75000, paymentDate: d('2026-09-29'), method: 'Bank Transfer', status: 'pending' },
    { project: logo, amount: 65000, paymentDate: d('2026-09-25'), method: 'Bank Transfer', status: 'paid' },
    { project: catalogue, amount: 55000, paymentDate: d('2026-09-20'), method: 'Bank Transfer', status: 'paid' },
  ].map((x) => ({ ...x, user: userId, project: x.project._id })));
}

module.exports = seedDemo;
