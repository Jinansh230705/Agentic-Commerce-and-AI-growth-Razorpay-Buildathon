// @ts-ignore
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Clean up existing data
  await prisma.variant.deleteMany()
  await prisma.product.deleteMany()
  await prisma.merchant.deleteMany()

  // 1. Create Merchant
  const merchant = await prisma.merchant.create({
    data: {
      merchantId: 'mrc_aster_gear',
      name: 'Aster Gear',
      domain: 'astergear.test',
      description: 'A modern direct-to-consumer running and fitness equipment company.',
      categories: JSON.stringify(['Running Shoes', 'Backpacks', 'Water Bottles', 'Apparel', 'Accessories']),
      supportedRegions: JSON.stringify(['IN']),
      currency: 'INR',
      policies: JSON.stringify({
        shippingRegions: ['India'],
        estimatedDelivery: '3-5 business days',
        shippingFee: { amount: 50, currency: 'INR' },
        returnWindow: '14 days',
        returnConditions: 'Unused, original packaging',
        refundMethod: 'original_payment_method',
        maxDiscountPercent: 20
      }),
      capabilities: JSON.stringify(['product_discovery', 'ap2', 'negotiation'])
    }
  })

  // 1b. Create Second Merchant
  const merchant2 = await prisma.merchant.create({
    data: {
      merchantId: 'mrc_omega_sports',
      name: 'Omega Sports',
      domain: 'omegasports.test',
      description: 'Your one-stop shop for premium athletic wear and sports equipment.',
      categories: JSON.stringify(['Apparel', 'Accessories', 'Training']),
      supportedRegions: JSON.stringify(['IN']),
      currency: 'INR',
      policies: JSON.stringify({
        shippingRegions: ['India'],
        estimatedDelivery: '2-4 business days',
        shippingFee: { amount: 100, currency: 'INR' },
        returnWindow: '30 days',
        returnConditions: 'With tags',
        refundMethod: 'store_credit',
        maxDiscountPercent: 15
      }),
      capabilities: JSON.stringify(['product_discovery', 'ap2', 'negotiation'])
    }
  })

  // 2. Create Products (Expanded to 20 realistic products)
  const products = [
    // RUNNING SHOES (7 products)
    {
      productId: 'prod_aster_run_pro',
      slug: 'aster-run-pro',
      name: 'Aster Run Pro',
      description: 'Premium running shoes for daily road running.',
      brand: 'Aster Gear',
      category: 'Running Shoes',
      priceAmount: 4999,
      inventory: 24,
      images: JSON.stringify(['/images/aster-run-pro.jpg']),
      attributes: JSON.stringify({
        terrain: ['road'],
        useCases: ['daily_running', '5k_training', '10k_training'],
        cushioning: 'medium'
      }),
      shipping: merchant.policies,
      returns: merchant.policies,
      variants: [
        { sku: 'sku_arp_9', attributes: JSON.stringify({ size: '9', color: 'blue' }), inventory: 10 },
        { sku: 'sku_arp_10', attributes: JSON.stringify({ size: '10', color: 'blue' }), inventory: 14 }
      ]
    },
    {
      productId: 'prod_aster_road_lite',
      slug: 'aster-road-lite',
      name: 'Aster Road Lite',
      description: 'Lightweight road running shoes for speed workouts.',
      brand: 'Aster Gear',
      category: 'Running Shoes',
      priceAmount: 3999,
      inventory: 15,
      images: JSON.stringify(['/images/aster-road-lite.jpg']),
      attributes: JSON.stringify({
        terrain: ['road'],
        useCases: ['speed_work', 'racing'],
        cushioning: 'low'
      }),
      shipping: merchant.policies,
      returns: merchant.policies,
      variants: [
        { sku: 'sku_arl_9', attributes: JSON.stringify({ size: '9', color: 'red' }), inventory: 5 },
        { sku: 'sku_arl_10', attributes: JSON.stringify({ size: '10', color: 'red' }), inventory: 10 }
      ]
    },
    {
      productId: 'prod_aster_trail_blazer',
      slug: 'aster-trail-blazer',
      name: 'Aster Trail Blazer',
      description: 'Rugged trail running shoes with deep lugs for ultimate traction.',
      brand: 'Aster Gear',
      category: 'Running Shoes',
      priceAmount: 5499,
      inventory: 40,
      images: JSON.stringify(['/images/aster-trail-blazer.jpg']),
      attributes: JSON.stringify({
        terrain: ['trail', 'mud'],
        useCases: ['trail_running', 'hiking'],
        cushioning: 'high'
      }),
      shipping: merchant.policies,
      returns: merchant.policies,
      variants: [
        { sku: 'sku_atb_8', attributes: JSON.stringify({ size: '8', color: 'green' }), inventory: 20 },
        { sku: 'sku_atb_9', attributes: JSON.stringify({ size: '9', color: 'green' }), inventory: 20 }
      ]
    },
    {
      productId: 'prod_aster_ultra_cush',
      slug: 'aster-ultra-cushion',
      name: 'Aster Ultra Cushion',
      description: 'Maximalist cushioning for long-distance comfort and recovery runs.',
      brand: 'Aster Gear',
      category: 'Running Shoes',
      priceAmount: 5999,
      inventory: 35,
      images: JSON.stringify(['/images/aster-ultra-cushion.jpg']),
      attributes: JSON.stringify({
        terrain: ['road'],
        useCases: ['marathon', 'recovery'],
        cushioning: 'maximum'
      }),
      shipping: merchant.policies,
      returns: merchant.policies,
      variants: [
        { sku: 'sku_auc_10', attributes: JSON.stringify({ size: '10', color: 'white' }), inventory: 15 },
        { sku: 'sku_auc_11', attributes: JSON.stringify({ size: '11', color: 'white' }), inventory: 20 }
      ]
    },
    {
      productId: 'prod_aster_sprint_spike',
      slug: 'aster-sprint-spike',
      name: 'Aster Sprint Spike',
      description: 'Track spikes designed for 100m to 400m sprint events.',
      brand: 'Aster Gear',
      category: 'Running Shoes',
      priceAmount: 3499,
      inventory: 18,
      images: JSON.stringify(['/images/aster-sprint-spike.jpg']),
      attributes: JSON.stringify({
        terrain: ['track'],
        useCases: ['sprinting', 'racing'],
        cushioning: 'minimal'
      }),
      shipping: merchant.policies,
      returns: merchant.policies,
      variants: [
        { sku: 'sku_ass_8', attributes: JSON.stringify({ size: '8', color: 'neon' }), inventory: 9 },
        { sku: 'sku_ass_9', attributes: JSON.stringify({ size: '9', color: 'neon' }), inventory: 9 }
      ]
    },
    {
      productId: 'prod_aster_marathon_pro',
      slug: 'aster-marathon-pro',
      name: 'Aster Marathon Pro',
      description: 'Carbon-plated racing shoes for marathon distances.',
      brand: 'Aster Gear',
      category: 'Running Shoes',
      priceAmount: 8999,
      inventory: 25,
      images: JSON.stringify(['/images/aster-run-pro.jpg']),
      attributes: JSON.stringify({
        terrain: ['road'],
        useCases: ['marathon', 'racing'],
        cushioning: 'high',
        tech: ['carbon_plate']
      }),
      shipping: merchant.policies,
      returns: merchant.policies,
      variants: [
        { sku: 'sku_amp_9', attributes: JSON.stringify({ size: '9', color: 'orange' }), inventory: 10 },
        { sku: 'sku_amp_10', attributes: JSON.stringify({ size: '10', color: 'orange' }), inventory: 15 }
      ]
    },
    {
      productId: 'prod_aster_everyday_jogger',
      slug: 'aster-everyday-jogger',
      name: 'Aster Everyday Jogger',
      description: 'Versatile and affordable running shoes for beginners and daily walkers.',
      brand: 'Aster Gear',
      category: 'Running Shoes',
      priceAmount: 2999,
      inventory: 60,
      images: JSON.stringify(['/images/aster-road-lite.jpg']),
      attributes: JSON.stringify({
        terrain: ['road', 'treadmill'],
        useCases: ['jogging', 'walking'],
        cushioning: 'medium'
      }),
      shipping: merchant.policies,
      returns: merchant.policies,
      variants: [
        { sku: 'sku_aej_9', attributes: JSON.stringify({ size: '9', color: 'black' }), inventory: 30 },
        { sku: 'sku_aej_10', attributes: JSON.stringify({ size: '10', color: 'black' }), inventory: 30 }
      ]
    },

    // BACKPACKS (3 products)
    {
      productId: 'prod_aster_run_pack_12l',
      slug: 'aster-run-pack-12l',
      name: 'Aster Run Pack 12L',
      description: 'Compact 12-liter hydration pack for trail running.',
      brand: 'Aster Gear',
      category: 'Backpacks',
      priceAmount: 2499,
      inventory: 30,
      images: JSON.stringify(['/images/aster-run-pack-12l.jpg']),
      attributes: JSON.stringify({
        capacityLiters: 12,
        hydrationCompatible: true,
        intendedUse: ['trail_running', 'hiking']
      }),
      shipping: merchant.policies,
      returns: merchant.policies,
      variants: [
        { sku: 'sku_arp12_blk', attributes: JSON.stringify({ color: 'black' }), inventory: 15 },
        { sku: 'sku_arp12_grn', attributes: JSON.stringify({ color: 'green' }), inventory: 15 }
      ]
    },
    {
      productId: 'prod_aster_commuter_20l',
      slug: 'aster-commuter-pack-20l',
      name: 'Aster Commuter Pack 20L',
      description: 'Run-to-work backpack with laptop sleeve and anti-bounce straps.',
      brand: 'Aster Gear',
      category: 'Backpacks',
      priceAmount: 3499,
      inventory: 20,
      images: JSON.stringify(['/images/aster-run-pack-12l.jpg']),
      attributes: JSON.stringify({
        capacityLiters: 20,
        laptopSleeve: true,
        intendedUse: ['commuting', 'travel']
      }),
      shipping: merchant.policies,
      returns: merchant.policies,
      variants: [
        { sku: 'sku_acp20_gry', attributes: JSON.stringify({ color: 'grey' }), inventory: 20 }
      ]
    },
    {
      productId: 'prod_aster_ultra_vest',
      slug: 'aster-ultra-vest',
      name: 'Aster Ultra Vest',
      description: 'Ultra-lightweight running vest for carrying essentials during marathons.',
      brand: 'Aster Gear',
      category: 'Backpacks',
      priceAmount: 1999,
      inventory: 40,
      images: JSON.stringify(['/images/aster-run-pack-12l.jpg']),
      attributes: JSON.stringify({
        capacityLiters: 5,
        hydrationCompatible: true,
        intendedUse: ['racing', 'marathon']
      }),
      shipping: merchant.policies,
      returns: merchant.policies,
      variants: [
        { sku: 'sku_auv_blk', attributes: JSON.stringify({ color: 'black' }), inventory: 20 },
        { sku: 'sku_auv_blu', attributes: JSON.stringify({ color: 'blue' }), inventory: 20 }
      ]
    },

    // WATER BOTTLES (3 products)
    {
      productId: 'prod_aster_steel_750',
      slug: 'aster-steel-750',
      name: 'Aster Steel 750',
      description: '750ml stainless steel insulated water bottle.',
      brand: 'Aster Gear',
      category: 'Water Bottles',
      priceAmount: 999,
      inventory: 50,
      images: JSON.stringify(['/images/aster-steel-750.jpg']),
      attributes: JSON.stringify({
        capacityMl: 750,
        material: 'stainless_steel',
        insulated: true
      }),
      shipping: merchant.policies,
      returns: merchant.policies,
      variants: [
        { sku: 'sku_ast750_slv', attributes: JSON.stringify({ color: 'silver' }), inventory: 25 },
        { sku: 'sku_ast750_blk', attributes: JSON.stringify({ color: 'black' }), inventory: 25 }
      ]
    },
    {
      productId: 'prod_aster_soft_flask_500',
      slug: 'aster-soft-flask-500',
      name: 'Aster Soft Flask 500',
      description: 'Collapsible 500ml soft flask, fits perfectly in running vests.',
      brand: 'Aster Gear',
      category: 'Water Bottles',
      priceAmount: 699,
      inventory: 80,
      images: JSON.stringify(['/images/aster-steel-750.jpg']),
      attributes: JSON.stringify({
        capacityMl: 500,
        material: 'tpu',
        insulated: false
      }),
      shipping: merchant.policies,
      returns: merchant.policies,
      variants: [
        { sku: 'sku_asf500_blu', attributes: JSON.stringify({ color: 'blue' }), inventory: 80 }
      ]
    },
    {
      productId: 'prod_aster_insulated_bidon_600',
      slug: 'aster-insulated-bidon-600',
      name: 'Aster Insulated Bidon 600',
      description: 'Squeezable 600ml insulated sports bottle to keep liquids cool.',
      brand: 'Aster Gear',
      category: 'Water Bottles',
      priceAmount: 899,
      inventory: 60,
      images: JSON.stringify(['/images/aster-steel-750.jpg']),
      attributes: JSON.stringify({
        capacityMl: 600,
        material: 'bpa_free_plastic',
        insulated: true
      }),
      shipping: merchant.policies,
      returns: merchant.policies,
      variants: [
        { sku: 'sku_aib600_wht', attributes: JSON.stringify({ color: 'white' }), inventory: 30 },
        { sku: 'sku_aib600_blk', attributes: JSON.stringify({ color: 'black' }), inventory: 30 }
      ]
    },

    // APPAREL (4 products)
    {
      productId: 'prod_aster_perf_tee',
      slug: 'aster-performance-tee',
      name: 'Aster Performance Tee',
      description: 'Moisture-wicking performance running t-shirt.',
      brand: 'Aster Gear',
      category: 'Apparel',
      priceAmount: 1299,
      inventory: 40,
      images: JSON.stringify(['/images/aster-windbreaker.jpg']),
      attributes: JSON.stringify({
        material: 'polyester',
        fit: 'athletic',
        breathability: 'high'
      }),
      shipping: merchant.policies,
      returns: merchant.policies,
      variants: [
        { sku: 'sku_apt_m', attributes: JSON.stringify({ size: 'M', color: 'gray' }), inventory: 20 },
        { sku: 'sku_apt_l', attributes: JSON.stringify({ size: 'L', color: 'gray' }), inventory: 20 }
      ]
    },
    {
      productId: 'prod_aster_distance_shorts',
      slug: 'aster-distance-shorts',
      name: 'Aster Distance Shorts',
      description: 'Lightweight 5-inch running shorts with secure zipper pockets.',
      brand: 'Aster Gear',
      category: 'Apparel',
      priceAmount: 1499,
      inventory: 50,
      images: JSON.stringify(['/images/aster-distance-shorts.jpg']),
      attributes: JSON.stringify({
        material: 'nylon_spandex',
        fit: 'relaxed',
        pockets: 3
      }),
      shipping: merchant.policies,
      returns: merchant.policies,
      variants: [
        { sku: 'sku_ads_m', attributes: JSON.stringify({ size: 'M', color: 'black' }), inventory: 25 },
        { sku: 'sku_ads_l', attributes: JSON.stringify({ size: 'L', color: 'black' }), inventory: 25 }
      ]
    },
    {
      productId: 'prod_aster_windbreaker',
      slug: 'aster-windbreaker-jacket',
      name: 'Aster Windbreaker Jacket',
      description: 'Packable, water-resistant running jacket for unpredictable weather.',
      brand: 'Aster Gear',
      category: 'Apparel',
      priceAmount: 2999,
      inventory: 30,
      images: JSON.stringify(['/images/aster-windbreaker.jpg']),
      attributes: JSON.stringify({
        material: 'nylon',
        fit: 'athletic',
        weatherResistance: 'water_resistant'
      }),
      shipping: merchant.policies,
      returns: merchant.policies,
      variants: [
        { sku: 'sku_awj_m', attributes: JSON.stringify({ size: 'M', color: 'neon' }), inventory: 15 },
        { sku: 'sku_awj_l', attributes: JSON.stringify({ size: 'L', color: 'neon' }), inventory: 15 }
      ]
    },
    {
      productId: 'prod_aster_thermal_tights',
      slug: 'aster-thermal-tights',
      name: 'Aster Thermal Tights',
      description: 'Fleece-lined running tights for cold winter runs.',
      brand: 'Aster Gear',
      category: 'Apparel',
      priceAmount: 1899,
      inventory: 20,
      images: JSON.stringify(['/images/aster-windbreaker.jpg']),
      attributes: JSON.stringify({
        material: 'polyester_spandex_fleece',
        fit: 'compression',
        weather: 'cold'
      }),
      shipping: merchant.policies,
      returns: merchant.policies,
      variants: [
        { sku: 'sku_att_m', attributes: JSON.stringify({ size: 'M', color: 'black' }), inventory: 10 },
        { sku: 'sku_att_l', attributes: JSON.stringify({ size: 'L', color: 'black' }), inventory: 10 }
      ]
    },

    // ACCESSORIES (3 products)
    {
      productId: 'prod_aster_run_cap',
      slug: 'aster-running-cap',
      name: 'Aster Running Cap',
      description: 'Lightweight breathable running cap.',
      brand: 'Aster Gear',
      category: 'Accessories',
      priceAmount: 599,
      inventory: 60,
      images: JSON.stringify(['/images/aster-run-cap.jpg']),
      attributes: JSON.stringify({
        material: 'nylon',
        fit: 'adjustable',
        weather: 'sun'
      }),
      shipping: merchant.policies,
      returns: merchant.policies,
      variants: [
        { sku: 'sku_arc_blk', attributes: JSON.stringify({ color: 'black' }), inventory: 60 }
      ]
    },
    {
      productId: 'prod_aster_reflective_belt',
      slug: 'aster-reflective-belt',
      name: 'Aster Reflective Belt',
      description: 'High-visibility reflective waist belt for night running.',
      brand: 'Aster Gear',
      category: 'Accessories',
      priceAmount: 499,
      inventory: 100,
      images: JSON.stringify(['/images/aster-run-cap.jpg']),
      attributes: JSON.stringify({
        material: 'elastic',
        fit: 'adjustable',
        visibility: 'high'
      }),
      shipping: merchant.policies,
      returns: merchant.policies,
      variants: [
        { sku: 'sku_arb_ylw', attributes: JSON.stringify({ color: 'yellow' }), inventory: 100 }
      ]
    },
    {
      productId: 'prod_aster_compression_socks',
      slug: 'aster-compression-socks',
      name: 'Aster Compression Socks',
      description: 'Knee-high compression socks to improve blood flow and recovery.',
      brand: 'Aster Gear',
      category: 'Accessories',
      priceAmount: 799,
      inventory: 70,
      images: JSON.stringify(['/images/aster-run-cap.jpg']),
      attributes: JSON.stringify({
        material: 'nylon_spandex',
        compressionLevel: '20-30mmHg',
        useCases: ['recovery', 'racing']
      }),
      shipping: merchant.policies,
      returns: merchant.policies,
      variants: [
        { sku: 'sku_acs_m', attributes: JSON.stringify({ size: 'M', color: 'black' }), inventory: 35 },
        { sku: 'sku_acs_l', attributes: JSON.stringify({ size: 'L', color: 'black' }), inventory: 35 }
      ]
    }
  ]

  for (const p of products) {
    const { variants, ...productData } = p
    const createdProduct = await prisma.product.create({
      data: {
        ...productData,
        merchantId: merchant.merchantId
      }
    })
    
    for (const v of variants) {
      await prisma.variant.create({
        data: {
          ...v,
          productId: createdProduct.productId
        }
      })
    }
  }

  const products2 = [
    {
      productId: 'prod_omega_training_mat',
      slug: 'omega-training-mat',
      name: 'Omega Pro Training Mat',
      description: 'High density premium training mat for home workouts.',
      brand: 'Omega Sports',
      category: 'Training',
      priceAmount: 1999,
      inventory: 50,
      images: JSON.stringify(['/images/aster-steel-750.jpg']),
      attributes: JSON.stringify({
        material: 'tpe',
        thickness: '8mm'
      }),
      shipping: merchant2.policies,
      returns: merchant2.policies,
      variants: [
        { sku: 'sku_otm_blk', attributes: JSON.stringify({ color: 'black' }), inventory: 50 }
      ]
    },
    {
      productId: 'prod_omega_resistance_bands',
      slug: 'omega-resistance-bands',
      name: 'Omega Resistance Bands Set',
      description: 'Set of 5 resistance bands with different tension levels.',
      brand: 'Omega Sports',
      category: 'Training',
      priceAmount: 1499,
      inventory: 100,
      images: JSON.stringify(['/images/aster-run-cap.jpg']),
      attributes: JSON.stringify({
        material: 'latex',
        levels: 5
      }),
      shipping: merchant2.policies,
      returns: merchant2.policies,
      variants: [
        { sku: 'sku_orb_set', attributes: JSON.stringify({ color: 'multi' }), inventory: 100 }
      ]
    }
  ]

  for (const p of products2) {
    const { variants, ...productData } = p
    const createdProduct = await prisma.product.create({
      data: {
        ...productData,
        merchantId: merchant2.merchantId
      }
    })
    
    for (const v of variants) {
      await prisma.variant.create({
        data: {
          ...v,
          productId: createdProduct.productId
        }
      })
    }
  }

  console.log('Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
