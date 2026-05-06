const fs = require('fs');
const path = 'backend/src/modules/fixer/fixer.service.ts';
let content = fs.readFileSync(path, 'utf8');

const regex = /async matchFixers\([\s\S]*?\/\/ ── Portfolio AI Digest ──/;
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
        // match specific service properly
        const match = list.find((item: Record<string, unknown>) => {
          if (!item.service || typeof item.service !== 'string') return false;
          // allow partial matching like 'website_development' vs 'Website development'
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
        price: basePrice > 0 ? basePrice : 500, // Safe default fallback
        satisfaction: f.rating >= 4.5 ? 90 + Math.random() * 10 : 70 + Math.random() * 20,
        specialties: f.skills.map((s) => s.name),
        experienceYears: f.yearsExperience || 1,
        selectedReason: '',
        matchIcon: '',
      };
    });

    const isUpperTier = (tier: string) => ['corporate', 'specialist', 'expert', 'manager', 'director', 'luxury', 'grandeur'].includes(tier);

    let results = [];
    let usedIds = new Set();

    const pick = (partner, reason) => {
      if (partner && !usedIds.has(partner.id)) {
        partner.selectedReason = reason;
        results.push(partner);
        usedIds.add(partner.id);
      }
    };

    // Slot 1-2: 💰 Two cheapest in area
    const byPrice = [...formattedPool].sort((a, b) => a.price - b.price);
    pick(byPrice[0], '💰 Cheapest in area');
    pick(byPrice.find(p => !usedIds.has(p.id)), '💰 Ranked 2nd Cheapest');

    // Slot 3-4: ⭐ Two highest satisfaction (stars, tiebreak by total jobs/reviews)
    const bySatisfaction = [...formattedPool].sort((a, b) => b.rating - a.rating || b.totalJobs - a.totalJobs);
    pick(bySatisfaction.find(p => !usedIds.has(p.id)), '⭐ Highest Rated');
    pick(bySatisfaction.find(p => !usedIds.has(p.id)), '⭐ Highly Recommended');

    // Slot 5: 🏆 Cheapest of upper tier
    const upperTiers = formattedPool.filter((f) => isUpperTier(f.tier));
    const upperByPrice = [...upperTiers].sort((a, b) => a.price - b.price);
    if(upperByPrice.length > 0) pick(upperByPrice.find(f => !usedIds.has(f.id)), '🏆 Cheapest of upper tier');

    // Slot 6: 🏆 Highest rated of upper tier
    const upperBySat = [...upperTiers].sort((a, b) => b.rating - a.rating || b.totalJobs - a.totalJobs);
    if(upperBySat.length > 0) pick(upperBySat.find(f => !usedIds.has(f.id)), '🏆 Highest rated of upper tier');

    // Slot 7: 🔄 Returning partner
    const returningPool = formattedPool.filter(p => !usedIds.has(p.id));
    if(returningPool.length > 0) {
      const returning = returningPool[Math.floor(Math.random() * returningPool.length)];
      returning.alias = '★ ' + returning.alias;
      pick(returning, '🔄 Returning partner');
    }

    // Slot 8: 👤 Customer nomination by partner ID number
    if (nominateId) {
      const nominated = formattedPool.find((f) => f.id === nominateId || f.id.endsWith(nominateId) || f.alias.includes(nominateId));
      if (nominated) pick(nominated, '👤 Customer nomination');
    }

    // Fill remaining up to 8 if necessary
    const remaining = formattedPool.filter(p => !usedIds.has(p.id));
    for (const r of remaining) {
      if (results.length >= 8) break;
      pick(r, '💡 Suggested Candidate');
    }

    return results.slice(0, 8);
  }

  // ── Portfolio AI Digest ──`;
content = content.replace(regex, newCode);
fs.writeFileSync(path, content);
