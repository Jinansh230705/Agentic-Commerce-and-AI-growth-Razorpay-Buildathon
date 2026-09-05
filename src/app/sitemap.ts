import { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'
 
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await prisma.product.findMany({
    select: { slug: true, updatedAt: true }
  })
  
  const productEntries = products.map((p: any) => ({
    url: `https://astergear.test/products/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))
  
  return [
    {
      url: 'https://astergear.test',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: 'https://astergear.test/products',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    ...productEntries
  ]
}
