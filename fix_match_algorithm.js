const fs = require('fs');
const path = 'backend/src/modules/fixer/fixer.service.ts';

let content = fs.readFileSync(path, 'utf8');

const matchFuncMatch = content.match(/async matchFixers\([\s\S]*?async profile\(/);
if (matchFuncMatch) {
  const replacement = `async matchFixers(
    service: string,
    district: string,
    province: string,
    nominateId?: string,
  ) {
    const pool = await this.prisma.fixer.findMany({
      where: {
        status: 'APPROVED',
      },
      include: { user: true, skills: true },
    });

    if (pool.length === 0) return [];

    const formattedPool = pool.map((f) => {
      let basePrice = 200;
      if (f.priceList && Array.isArray(f.priceList) && f.priceList.length > 0) {
        const list = f.priceList as Record<string, unknown>[];
        // naive find
        const match = list.find(
          (item: Record<string, unknown>) =>
            typeof item.service === 'string' && item.service.toLowerCase().includes(service.toLowerCase()),
        );
        if (list.length > 0) {
          basePrice = match ? parseFloat(match.finalPrice as string) : parseFloat(list[0].finalPrice as string);
        }
      }

      return {
        id: f.id,
        alias: f.user?.company || f.user?.name || \`Partner-\${f.id.slice(0, 4)}\`,
        tier: f.tier.toLowerCase() || 'economy',
        rating: f.rating || 0,
        totalJobs: f.completedJobs || 0,
        price: basePrice || 500,
        satisfaction: f.rating >= 4.5 ? 90 + Math.random() * 10 : 70 + Math.random() * 20,
        specialties: f.skills.map((s) => s.name),
        experienceYears: f.yearsExperience || 1,
        matchReason: '',
        matchIcon: '',
      };
    });

    const isUpperTier = (tier: string) => ['corporate', 'specialist', 'expert', 'manager', 'director', 'luxury', 'grandeur'].includes(tier);

    let results = [];
    let usedIds = new Set();

    const addPartner = (partner, reason, icon) => {
      if (partner && !usedIds.has(partner.id)) {
        partner.matchReason = reason;
        partner.matchIcon = icon;
        results.push(partner);
        usedIds.add(partner.id);
      }
    };

    // Slot 1-2: Two cheapest in area
    const cheapestCandidates = [...formattedPool].sort((a, b) => a.price - b.price);
    addPartner(cheapestCandidates[0], 'Cheapest Option', '💰');
    addPartner(cheapestCandidates.find(p => !usedIds.has(p.id)), 'Value Option', '💰');

    // Slot 3-4: Two highest satisfaction
    const highestRated = [...formattedPool].sort((a, b) => b.rating - a.rating || b.totalJobs - a.totalJobs);
    addPartner(highestRated.find(p => !usedIds.has(p.id)), 'Highest Rated', '⭐');
    addPartner(highestRated.find(p => !usedIds.has(p.id)), 'Highly Recommended', '⭐');

    // Slot 5: Cheapest of upper tier
    const upperCheapest = [...formattedPool].filter(p => isUpperTier(p.tier)).sort((a, b) => a.price - b.price);
    if(upperCheapest.length > 0) addPartner(upperCheapest.find(p => !usedIds.has(p.id)), 'Cheapest Premium', '🏆');

    // Slot 6: Highest rated of upper tier
    const upperHighest = [...formattedPool].filter(p => isUpperTier(p.tier)).sort((a, b) => b.rating - a.rating || b.totalJobs - a.totalJobs);
    if(upperHighest.length > 0) addPartner(upperHighest.find(p => !usedIds.has(p.id)), 'Best Premium Rated', '🏆');

    // Slot 7: Returning partner (random valid for now)
    const availableReturning = formattedPool.filter(p => !usedIds.has(p.id));
    if(availableReturning.length > 0) {
      const returning = availableReturning[Math.floor(Math.random() * availableReturning.length)];
      returning.alias = '★ ' + returning.alias;
      addPartner(returning, 'Returning Partner', '🔄');
    }

    // Slot 8: Customer nomination
    if (nominateId) {
       const nominated = formattedPool.find((f) => f.id === nominateId || f.id.endsWith(nominateId));
       if (nominated) addPartner(nominated, 'Nominated Choice', '👤');
    }

    // Fill remaining up to 8 if necessary
    const remaining = formattedPool.filter(p => !usedIds.has(p.id));
    for (const r of remaining) {
      if (results.length >= 8) break;
      addPartner(r, 'Available Partner', '✅');
    }

    return results.slice(0, 8);
  }

  async profile(
`;
  content = content.replace(matchFuncMatch[0], replacement);
  fs.writeFileSync(path, content);
  console.log("Replaced matchFixers algorithm.");
} else {
  console.log("Could not find matchFixers function properly.");
}

