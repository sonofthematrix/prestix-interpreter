/**
 * ZenStack v3 TanStack Query Hooks - Usage Examples
 * 
 * This file demonstrates how to use ZenStack-generated CRUD hooks with access policies.
 * 
 * IMPORTANT: ZenStack v3 uses `useClientQueries` hook directly - no file generation needed.
 * The hooks are generated at runtime from your schema.
 * 
 * Setup Requirements:
 * 1. Wrap your app with ZenStackHooksProvider (see zenstack-hooks-provider.tsx)
 * 2. Import schema-lite.ts (generated with --lite flag for security)
 * 3. Use useClientQueries to get model-specific hooks
 */

'use client';

import { useClientQueries } from '@zenstackhq/tanstack-query/react';
// Use schema-lite.ts for frontend (doesn't expose access policies)
import { schema } from '@/zenstack/schema-lite';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Example: Fetching users with access policy enforcement
 */
export function UsersListExample() {
  const client = useClientQueries(schema);

  // Query hook - automatically enforces @@allow('read') policies
  const { data: users, isLoading, error } = client.user.useFindMany({
    where: {
      status: 'ACTIVE',
    },
    include: {
      memberProfile: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (isLoading) return <div>Loading users...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h2>Users</h2>
      <ul>
        {users?.map((user) => (
          <li key={user.id}>
            {user.name} ({user.email}) - {user.role}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Example: Creating a booking with access policy enforcement
 */
export function CreateBookingExample() {
  const client = useClientQueries(schema);

  // Mutation hook - automatically enforces @@allow('create') policies
  const createBooking = client.booking.useCreate({
    optimisticUpdate: true, // Enable optimistic updates
  });

  const handleCreateBooking = () => {
    createBooking.mutate({
      data: {
        memberId: 'member-123',
        startTime: new Date().toISOString(),
        totalAmount: 100 as unknown as Decimal,
        bookingNumber: 'BOOK123',
        baseAmount: new Decimal(100),
        venueId: 'venue-123',
        bookingType: 'TABLE_RESERVATION',
        bookingDate: new Date() as unknown as Date,
        // ... other fields
      },
    });
  };

  return (
    <div>
      <button onClick={handleCreateBooking} disabled={createBooking.isPending}>
        {createBooking.isPending ? 'Creating...' : 'Create Booking'}
      </button>
      {createBooking.isError && (
        <div>Error: {createBooking.error?.message}</div>
      )}
    </div>
  );
}

/**
 * Example: Updating a venue profile
 */
export function UpdateVenueExample({ venueId }: { venueId: string }) {
  const client = useClientQueries(schema);

  // Fetch single venue
  const { data: venue } = client.venueProfile.useFindUnique({
    where: { id: venueId },
  });

  // Update mutation - automatically enforces @@allow('update') policies
  const updateVenue = client.venueProfile.useUpdate({
    optimisticUpdate: true,
  });

  const handleUpdate = () => {
    updateVenue.mutate({
      where: { id: venueId },
      data: {
        name: 'Updated Venue Name',
        // ... other fields
      },
    });
  };

  return (
    <div>
      <h3>{venue?.name}</h3>
      <button onClick={handleUpdate} disabled={updateVenue.isPending}>
        Update Venue
      </button>
    </div>
  );
}

/**
 * Example: Infinite scroll pagination
 */
export function VenuesInfiniteList() {
  const client = useClientQueries(schema);
  const PAGE_SIZE = 20;

  const fetchArgs = {
    where: {
      status: 'ACTIVE',
    },
    include: {
      venueTables: true,
    },
    orderBy: {
      createdAt: 'desc' as const,
    },
    take: PAGE_SIZE,
  };

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    client.venueProfile.useInfiniteFindMany(fetchArgs as any, {
      getNextPageParam: (lastPage, pages) => {
        if (lastPage.length < PAGE_SIZE) {
          return undefined;
        }
        const fetched = pages.flatMap((item) => item).length;
        return {
          ...fetchArgs,
          skip: fetched,
        };
      },
    });

  return (
    <div>
      {data?.pages.map((page, i) => (
        <div key={i}>
          {page.map((venue) => (
            <div key={venue.id}>{venue.name}</div>
          ))}
        </div>
      ))}
      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}

/**
 * Example: Delete with automatic query invalidation
 */
export function DeleteBookingExample({ bookingId }: { bookingId: string }) {
  const client = useClientQueries(schema);

  // Delete mutation - automatically invalidates related queries
  const deleteBooking = client.booking.useDelete({
    invalidateQueries: true, // Default: automatically invalidate related queries
  });

  const handleDelete = () => {
    deleteBooking.mutate({
      where: { id: bookingId },
    });
  };

  return (
    <button onClick={handleDelete} disabled={deleteBooking.isPending}>
      {deleteBooking.isPending ? 'Deleting...' : 'Delete Booking'}
    </button>
  );
}
