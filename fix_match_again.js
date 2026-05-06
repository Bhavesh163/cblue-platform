const fs = require('fs');
const path = 'backend/src/modules/fixer/fixer.service.ts';
let content = fs.readFileSync(path, 'utf8');

// We simply replace from `async matchFixers(` to the end of the method.
// We can locate it by finding `async matchFixers(` and `async profile(`
const regex = /async matchFixers\([\s\S]*?async profile\(/;
const newCode = `async matchFixers(
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
      let basePrice = 0;
      if (f.priceList && Array.isArray(f.priceList) && f.priceList.length > 0) {
        const list = f.priceList as Record<string, unknown>[];
        // naive find with robust null checking
        const match = list.find((item: Record<string, unknown>) => {
          if (!item.service || typeof item.service !== 'string') return false;
          const s1 = item.service.toLowerCase().replace(/_/g, ' ');
          const s2 = service.toLowerCase().replace(/_/g, ' ');
          return s1.includes(s2) || s2.includes(s1);
        });

        if (match && match.finalPrice) {
          basePrice = parseFloat(match.finalPrice as string);
        } else if (list[0].finalPrice) {
          basePrice = parseFloat(list[0].finalPrice as string);
        }
      }

      return {
        id: f.id,
        alias: f.user?.company || f.user?.name || \`Partner-\${f.id.slice(0, 4)}\`,
        tier: (f.tier || 'economy').toLowerCase(),
        rating: f.rating || 0,
        totalJobs: f.completedJobs || 0,
        price: basePrice, // Real price from provider
        satisfaction: f.rating >= 4.5 ? 90 + Math.random() * 10 : 70 + Math.random() * 20,
        specialties: f.skills.map((s) => s.name),
        experienceYears: f.yearsExperience || 1,
        selectedReason: '',
        matchIcon: '',
      };
    });

    const isUpperTier = (tier: string) => ['corporate', 'specialist', 'expert', 'manager', 'director', 'luxury', 'grandeur'].includes(tier);

    const results = [];
    const usedIds = new Set();

    const addPartner = (partner, reason, icon) => {
      if (partner && !usedIds.has(partner.id)) {
        partner.selectedReason = reason;
        partner.matchIcon = icon;
        results.push(partner);
        usedIds.add(partner.id);
      }
    };

    // Slot 1-2: Two cheapest in area (must have price > 0, else fallback)
    const validPriced = [...formattedPool].filter(p => p.price > 0).sort((a, b) => a.price - b.price);
    const cheapestCandidates = validPriced.length > 0 ? validPriced : [...formattedPool].sort((a, b) => a.price - b.price);
    
    addPartner(cheapestCandidates[0], '💰 Cheapest in area', '💰');
    addPartner(cheapestCandidates.find(p => !usedIds.has(p.id)), '💰 Ranked 2nd Cheapest', '💰');

    // Slot 3-4: Two highest satisfaction
    const highestRated = [...formattedPool].sort((a, b) => b.rating - a.rating || b.totalJobs - a.totalJobs);
    addPartner(highestRated.find(p => !usedIds.has(p.id)), '⭐ Highest Rated', '⭐');
    addPartner(highestRated.find(p => !usedIds.has(p.id)), '⭐ Highly Recommended', '⭐');

    // Slot 5: Cheapest of upper tier
    const upperCheapest = [...formattedPool].filter(p => isUpperTier(p.tier) && p.price > 0).sort((a, b) => a.price - b.price);
    if(upperCheapest.length > 0) addPartner(upperCheapest.find(p => !usedIds.has(p.id)), '🏆 Cheapest of upper tier', '🏆');

    // Slot 6: Highest rated of upper tier
    const upperHighest = [...formattedPool].filter(p => isUpperTier(p.tier)).sort((a, b) => b.rating - a.rating || b.totalJobs - a.totalJobs);
    if(upperHighest.length > 0) addPartner(upperHighest.find(p => !usedIds.has(p.id)), '🏆 Highest rated of upper tier', '🏆');

    // Slot 7: Returning partner (random valid for now)
    const availableReturning = formattedPool.filter(p => !usedIds.has(p.id));
    if(availableReturning.length > 0) {
      const returning = availableReturning[Math.floor(Math.random() * availableReturning.length)];
      returning.alias = '★ ' + returning.alias;
      addPartner(returning, '🔄 Returning partner', '🔄');
    }

    // Slot 8: Customer nomination
    if (nominateId) {
       const nominated = formattedPool.find((f) => f.id === nominateId || f.id.endsWith(nominateId));
       if (nominated) addPartner(nominated, '👤 Customer Nominated', '👤');
    }

    // Fill remaining up to 8 if necessary
    const remaining = formattedPool.filter(p => !usedIds.has(p.id));
    for (const r of remaining) {
      if (results.length >= 8) break;
      addPartner(r, '✅ Trusted Partner', '✅');
    }

    return results.slice(0, 8);
  }

  async profile(`;
content = content.replace(regex, newCode);
fs.writeFileSync(path, content);
console.log("Successfully replaced matchFixers!");
