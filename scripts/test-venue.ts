import 'dotenv/config';
import { createClient } from '@/lib/db';
import { getSystemUser } from '@/lib/utils/system-user';

async function main() {
  const systemUser = await getSystemUser();
  const db = createClient({
    ...systemUser,
    role: 'PLATFORM_ADMIN' as const
  });

  const venues = await db.venueProfile.findMany({
    select: { id: true, name: true, userId: true }
  });

  console.log('Venues:', venues);

  // Check if the specific venue exists
  const specificVenue = await db.venueProfile.findFirst({
    where: { id: 'cmmb4mvhv0001d4t00zxz5uvf' }
  });

  console.log('Specific venue:', specificVenue);
}

main().catch(console.error);