import {
  generateRandomIDv1,
  type Schedule,
  type SchedulePlan,
} from "@planify/types";

/**
 * Placeholder implementation preserved from the original Next.js route
 * handler: fixed Paris itinerary after an artificial delay. Replaced by
 * real AI generation in a later phase.
 */
export async function generateSchedulePlan(
  input: Schedule,
): Promise<SchedulePlan> {
  console.log("Received wizard schedule:", input);

  //fake waiting time
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const PLACEHOLDER_SCHEDULE = {
    title: "Trip to Paris",
    startDate: "2026-08-18",
    endDate: "2026-08-21",
    preTasks: [
      //Things to do before going through the schedule in order of priority
      {
        id: "book-flights",
        title: "Book flights to Paris",
        details: {
          airline: "Air France",
          departureTime: "08:00",
          estimatedFlightTime: "8 hours",
        },
      },
      {
        id: "book-hotel",
        title: "Book a hotel reservation",
        details: {
          hotel: {
            name: "St. Bueve",
          },
          nights: 4,
        },
      },
      {
        id: "book-attractions",
        title: "Book time slots Eiffel Tower summit slot",
        details: {
          monumentViewings: [
            {
              name: "Eiffel Tower Summit Slot",
              time: "10:00",
            },
          ],
          tours: [
            {
              name: "Bateaux Parisiens River Cruise",
              time: "14:00",
            },
            {
              name: "Palais Garnier Tour",
              time: "12:30",
            },
          ],
          museums: [
            {
              name: "Louvre Museum",
              time: "18:30",
            },
            {
              name: "Versailles",
              time: "17:30",
            },
          ],
          chapelViewings: [
            {
              name: "Sainte-Chapelle",
              time: "09:00",
            },
          ],
        },
      },
      {
        id: "book-restaurants",
        title: "Book reservations for restaurants",
        details: {
          restaurants: [
            {
              name: "Le Jules Verne",
              time: "12:30",
            },
            {
              name: "Ã‰picure",
              notes: "Michelin star",
              time: "20:00",
            },
          ],
        },
      },
      {
        id: "museum-pass",
        title: "Get a Paris Museum Pass",
        details: {
          notes:
            "Covers the Orsay, Louvre, Arc de Triomphe, Versailles, and more",
        },
      },
    ],
    tasks: [
      //Each task
      {
        id: "hotel-check-in",
        date: "2026-08-18",
        title: "Hotel Check-in",
        startTime: 900, // 15:00
        estimatedDuration: 30, //in minutes
        details: {
          location: {
            name: "Hotel St. Bueve",
          },
        },
      },

      {
        id: "breakfast",
        date: "2026-08-19",
        title: "Go out for breakfast",
        startTime: 480, // 08:00
        estimatedDuration: 90, //in minutes
        details: {
          location: {
            name: "La Petite Bleu",
          },
        },
      },
      {
        id: "eiffel-tower",
        date: "2026-08-19",
        title: "Visit the Eiffel Tower",
        startTime: 600, // 10:00
        estimatedDuration: 60,
      },
      {
        id: "lunch",
        date: "2026-08-19",
        title: "Eat Lunch",
        startTime: 750, // 12:30
        estimatedDuration: 45, //ends at 13.15
        details: {
          location: {
            name: "Le Jules Verne",
          },
        },
      },
      {
        id: "river-cruise",
        date: "2026-08-19",
        title: "Bateaux Parisiens River Cruise",
        startTime: 840, // 14:00
        estimatedDuration: 60, //ends at 15.0
        details: {
          location: {
            name: "Seine River",
          },
        },
      },
      {
        id: "public-garden",
        date: "2026-08-19",
        title: "Explore a Public Garden",
        startTime: 930, // 15:30
        estimatedDuration: 60, //ends at 16.30
        details: {
          location: {
            name: "Tuileries Garden",
          },
        },
      },
      {
        id: "orsay",
        date: "2026-08-19",
        title: "Visit the MusÃ©e d'Orsay",
        startTime: 1020, // 17:00
        estimatedDuration: 60,
      },
      {
        id: "louvre",
        date: "2026-08-19",
        title: "Visit the Louvre Museum",
        startTime: 1110, // 18:30
        estimatedDuration: 60,
      },
      {
        id: "michelin-dinner",
        date: "2026-08-19",
        title: "Dinner at a Michelin Star Restaurant",
        startTime: 1200, // 20:00
        estimatedDuration: 60, //ends at 21.0
        details: {
          location: {
            name: "Ã‰picure",
          },
          notes: "8th Arrondissement",
        },
      },

      {
        id: "history-modern-paris",
        date: "2026-08-20",
        title: "History and Modern Paris",
        startTime: 540, // 09:00
        estimatedDuration: 120, //ends at 11.0
        details: {
          notes: "Visit Notre-Dame Cathedral and Sainte-Chapelle",
        },
      },
      {
        id: "latin-quarter",
        date: "2026-08-20",
        title: "Explore the Latin Quarter",
        startTime: 690, // 11:30
        estimatedDuration: 60, //ends at 12.30
      },
      {
        id: "montmartre",
        date: "2026-08-20",
        title: "Montmartre and SacrÃ©-CÅ“ur Basilica",
        startTime: 780, // 13:00
        estimatedDuration: 120, //ends at 15.0
      },
      {
        id: "vie-romantique",
        date: "2026-08-20",
        title: "MusÃ©e de la Vie Romantique",
        startTime: 930, // 15:30
        estimatedDuration: 60, //ends at 16.30
      },
      {
        id: "travel-versailles",
        date: "2026-08-20",
        title: "Travel to Versailles",
        startTime: 990, // 16:30
        estimatedDuration: 60, //ends at 17.30
        details: {
          notes: "Take the RER C to Versailles-ChÃ¢teau-Rive Gauche station",
        },
      },
      {
        id: "versailles-tour",
        date: "2026-08-20",
        title: "Tour the Palace of Versailles",
        startTime: 1050, // 17:30
        estimatedDuration: 120, //ends at 19.30
        details: {
          notes: "Hall of Mirrors and the King's Grand Apartments",
        },
      },

      {
        id: "versailles-picnic",
        date: "2026-08-21",
        title: "Picnic lunch in the Gardens",
        startTime: 750, // 12:30
        estimatedDuration: 90, //ends at 14.0
        details: {
          notes: "Pack a picnic or grab a bite at a garden cafÃ©",
        },
      },
      {
        id: "grand-trianon",
        date: "2026-08-21",
        title: "Grand Trianon and Marie-Antoinette's Estate",
        startTime: 840, // 14:00
        estimatedDuration: 120, //ends at 16.0
        details: {
          notes: "Reachable via the Petit Train or a scenic walk",
        },
      },
      {
        id: "return-to-paris",
        date: "2026-08-21",
        title: "Return to Paris",
        startTime: 990, // 16:30
        estimatedDuration: 60, //ends at 17.30
        details: {
          notes: "RER C back to central Paris",
        },
      },

      {
        id: "arc-de-triomphe",
        date: "2026-08-21",
        title: "Climb the Arc de Triomphe",
        startTime: 540, // 09:00
        estimatedDuration: 60, //ends at 10.0
        details: {
          notes: "Panoramic view over the 12 avenues of the Ã‰toile",
        },
      },
      {
        id: "champs-elysees",
        date: "2026-08-21",
        title: "Stroll down the Champs-Ã‰lysÃ©es",
        startTime: 630, // 10:30
        estimatedDuration: 60, //ends at 11.30
        details: {
          notes: "Window shopping and a coffee break",
        },
      },
      {
        id: "palais-garnier",
        date: "2026-08-21",
        title: "Tour the Palais Garnier",
        startTime: 750, // 12:30
        estimatedDuration: 90, //ends at 14.0
        details: {
          notes: "Self-guided tour of the Paris Opera House",
        },
      },
      {
        id: "marais",
        date: "2026-08-21",
        title: "Explore the Marais",
        startTime: 870, // 14:30
        estimatedDuration: 120, //ends at 16.30
        details: {
          notes: "Boutiques, galleries, and the Place des Vosges",
        },
      },
      {
        id: "seine-picnic",
        date: "2026-08-21",
        title: "Sunset picnic along the Seine",
        startTime: 1080, // 18:00
        estimatedDuration: 90, //ends at 19.30
        details: {
          notes: "Baguette, cheese, and wine for a final Paris evening",
        },
      },
    ],
  };

  const schedulePlan: SchedulePlan = {
    id: generateRandomIDv1(),
    ...PLACEHOLDER_SCHEDULE,
  };

  return schedulePlan;
}
