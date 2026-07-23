import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { PropertyStore } from "../services/propertyStore";
import { makeRequest, PlaceDetailsResult } from "../_core/map";
import { getDb } from "../db";
import { marketingApiCaches } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import axios from "axios";

// Helper to get Lat/Lng for a property
async function getCoordinates(propertyId: string) {
  const property = PropertyStore.getById(propertyId);
  if (!property) throw new TRPCError({ code: "NOT_FOUND", message: "Property not found" });

  const db = await getDb();
  
  if (property.studentCrowdId) {
    const cacheKey = `geocode:sc:${property.studentCrowdId}`;
    if (db) {
      const cached = await db.select().from(marketingApiCaches).where(eq(marketingApiCaches.cacheKey, cacheKey)).limit(1);
      if (cached.length > 0 && cached[0].expiresAt > new Date()) {
        return cached[0].data as { lat: number, lng: number };
      }
    }
    
    const apiKey = process.env.STUDENT_CROWD_API_KEY;
    if (apiKey) {
      try {
        const res = await axios.get(`https://data.studentcrowd.net/api/v1.0/halls/${property.studentCrowdId}`, {
          headers: { 'X-Api-Key': apiKey },
          timeout: 5000
        });
        const lat = res.data?.attributes?.latitude;
        const lng = res.data?.attributes?.longitude;
        if (lat && lng) {
           const location = { lat, lng };
           if (db) {
             const expiresAt = new Date();
             expiresAt.setFullYear(expiresAt.getFullYear() + 1);
             await db.insert(marketingApiCaches).values({ cacheKey, data: location, expiresAt })
                     .onDuplicateKeyUpdate({ set: { data: location, expiresAt }});
           }
           return location;
        }
      } catch(e) {
         console.warn("[Geocode] StudentCrowd failed, falling back...");
      }
    }
  }

  // Fallback to Google Maps if available
  if (!property.googleMapsPlaceId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Property has no Place ID or SC ID" });
  }

  // If BUILT_IN_FORGE_API_URL is missing, we can't use the proxy.
  if (!process.env.BUILT_IN_FORGE_API_URL) {
     throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Google Maps proxy credentials missing. Please set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY in .env" });
  }

  const cacheKey = `geocode:gmaps:${property.googleMapsPlaceId}`;
  if (db) {
    const cached = await db.select().from(marketingApiCaches).where(eq(marketingApiCaches.cacheKey, cacheKey)).limit(1);
    if (cached.length > 0 && cached[0].expiresAt > new Date()) {
      return cached[0].data as { lat: number, lng: number };
    }
  }

  const res = await makeRequest<PlaceDetailsResult>("/maps/api/place/details/json", {
    place_id: property.googleMapsPlaceId,
    fields: "geometry"
  });

  const location = res.result?.geometry?.location;
  if (!location) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to geocode place ID" });
  }

  if (db) {
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1); // Cache for 1 year
    await db.insert(marketingApiCaches).values({
      cacheKey,
      data: location,
      expiresAt
    }).onDuplicateKeyUpdate({ set: { data: location, expiresAt }});
  }

  return location;
}

export const researchRouter = router({
  getCrimeData: protectedProcedure
    .input(z.object({ propertyId: z.string() }))
    .query(async ({ input }) => {
       const { lat, lng } = await getCoordinates(input.propertyId);
       
       const db = await getDb();
       const cacheKey = `crime:${lat.toFixed(3)},${lng.toFixed(3)}`; // rough grouping
       
       if (db) {
         const cached = await db.select().from(marketingApiCaches).where(eq(marketingApiCaches.cacheKey, cacheKey)).limit(1);
         if (cached.length > 0 && cached[0].expiresAt > new Date()) {
           return cached[0].data;
         }
       }

       try {
         const res = await axios.get(`https://data.police.uk/api/crimes-street/all-crime?lat=${lat}&lng=${lng}`);
         
         const data = res.data;
         // Group by category
         const summary = data.reduce((acc: any, crime: any) => {
           acc[crime.category] = (acc[crime.category] || 0) + 1;
           return acc;
         }, {});

         if (db) {
           const expiresAt = new Date();
           expiresAt.setDate(expiresAt.getDate() + 30); // cache for 30 days
           await db.insert(marketingApiCaches).values({ cacheKey, data: summary, expiresAt }).onDuplicateKeyUpdate({ set: { data: summary, expiresAt }});
         }

         return summary;
       } catch (err: any) {
         console.error("[Crime API Error]", err.message);
         return { error: "Failed to fetch crime data" };
       }
    }),

  getBusDisruptions: protectedProcedure
    .input(z.object({ propertyId: z.string() }))
    .query(async ({ input }) => {
       const { lat, lng } = await getCoordinates(input.propertyId);
       const apiKey = process.env.BODS_API_KEY || "1c96afb66ed3ae4711ac702654a15713eefacd47";
       
       // Calculate a small bounding box
       const offset = 0.01;
       const minLon = lng - offset;
       const minLat = lat - offset;
       const maxLon = lng + offset;
       const maxLat = lat + offset;
       
       try {
         const res = await axios.get(`https://data.bus-data.dft.gov.uk/api/v1/dataset/?boundingBox=${minLon},${minLat},${maxLon},${maxLat}`, {
           headers: { Authorization: `Token ${apiKey}` }
         });
         return {
           count: res.data.count,
           results: res.data.results.map((r: any) => ({
             operatorName: r.operatorName,
             description: r.description,
             status: r.status,
             url: r.url
           }))
         };
       } catch (err: any) {
         console.error("[BODS Error]", err.response?.data || err.message);
         return { error: "Failed to fetch BODS data" };
       }
    }),

  getCompetitors: protectedProcedure
    .input(z.object({ propertyId: z.string().optional(), city: z.string().optional() }))
    .query(async ({ input }) => {
       let city = input.city;
       if (!city && input.propertyId) {
         const property = PropertyStore.getById(input.propertyId);
         city = property?.city;
       }
       
       if (!city) return [];

       const apiKey = process.env.STUDENT_CROWD_API_KEY;
       if (!apiKey) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Missing StudentCrowd API key" });

       try {
         const res = await axios.get(`https://data.studentcrowd.net/api/v1.0/halls`, {
           params: {
             size: 500,
             'filter[city]': city
           },
           headers: { 'X-Api-Key': apiKey }
         });
         
         const halls = res.data?.data || [];
         
         const cityHalls = halls
           .filter((h: any) => {
             const hallCity = h.attributes?.city || "";
             return hallCity.toLowerCase() === city!.toLowerCase();
           })
           .map((h: any) => ({
             id: h.id,
             name: h.attributes?.name,
             landlord: h.attributes?.landlord,
             minimumPrice: h.attributes?.minimumPrice,
             pricePersonWeek: h.attributes?.pricePersonWeek,
             city: h.attributes?.city
           }))
           .sort((a: any, b: any) => (a.minimumPrice || Infinity) - (b.minimumPrice || Infinity));
         
         // Fetch incentives for top 10 competitors in parallel
         const competitorsWithIncentives = await Promise.all(
           cityHalls.slice(0, 10).map(async (c: any) => {
             try {
               const rtRes = await axios.get(`https://data.studentcrowd.net/api/v1.0/halls/${c.id}/room-types`, {
                 headers: { 'X-Api-Key': apiKey },
                 timeout: 2000
               });
               const roomTypes = rtRes.data?.data || [];
               if (roomTypes.length === 0) return { ...c, incentive: null };

               const firstRtId = roomTypes[0].id;
               const tenRes = await axios.get(`https://data.studentcrowd.net/api/v1.0/room-types/${firstRtId}/room-tenancies`, {
                 headers: { 'X-Api-Key': apiKey },
                 timeout: 2000
               });
               const tenancies = tenRes.data?.data || [];
               const activeIncentive = tenancies.find((t: any) => 
                 t.attributes?.incentiveText && 
                 t.attributes.incentiveText !== 'none' && 
                 t.attributes.incentiveText.trim() !== ''
               );
               return { ...c, incentive: activeIncentive ? activeIncentive.attributes.incentiveText : null };
             } catch (e) {
               return { ...c, incentive: null };
             }
           })
         );

         return competitorsWithIncentives;
       } catch (err: any) {
         console.error("[StudentCrowd Error]", err.message);
         return [];
       }
    })
});
