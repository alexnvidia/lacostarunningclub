import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import { initialize } from '@oas-tools/core';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 3007;
const USE_MOCK = process.env.USE_MOCK === 'true';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, _res, next) => {
  console.log(`📝 performance-service: ${req.method} ${req.path}`);
  next();
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'performance-service',
    mode: USE_MOCK ? 'mock' : 'production',
    timestamp: new Date().toISOString()
  });
});

const startServer = () => {
  http.createServer(app).listen(PORT, () => {
    console.log('═══════════════════════════════════════════════');
    console.log(`✅  Performance Service Running`);
    console.log('═══════════════════════════════════════════════');
    console.log(`    Port:        ${PORT}`);
    console.log(`    Mode:        ${USE_MOCK ? '🎭 MOCK' : '🚀 OAS Tools'}`);
    console.log('───────────────────────────────────────────────');
    console.log(`    ❤️  Health:     http://localhost:${PORT}/health`);
    if (!USE_MOCK) {
      console.log(`    📚 API Docs:   http://localhost:${PORT}/docs`);
    }
    console.log('═══════════════════════════════════════════════');
  });
};

if (USE_MOCK) {
  console.log('🎭 Starting Performance Service in MOCK mode...');

  // Mock data
  const mockResults: any[] = [];
  const mockWorkouts = [
    {
      id: 'workout-1',
      week_number: 42,
      year: 2024,
      title: 'Week 42 - Base Building',
      description: 'Focus on building aerobic base',
      published_date: '2024-10-14T00:00:00Z',
      workouts: [
        {
          day: 'Monday',
          type: 'Easy Run',
          duration: '45 min',
          intensity: 'Easy',
          description: 'Recovery run at comfortable pace'
        },
        {
          day: 'Wednesday',
          type: 'Tempo Run',
          duration: '30 min',
          intensity: 'Moderate',
          description: '10 min warm-up, 15 min tempo, 5 min cool-down'
        },
        {
          day: 'Saturday',
          type: 'Long Run',
          duration: '90 min',
          intensity: 'Easy',
          description: 'Long slow distance run'
        }
      ]
    }
  ];

  app.get('/', (_req: Request, res: Response) => {
    res.json({
      service: 'performance-service',
      version: '1.0.0',
      mode: 'mock',
      endpoints: {
        uploadResult: 'POST /performance/results',
        getUserResults: 'GET /performance/results',
        getPublicResults: 'GET /performance/results/public',
        getCurrentWorkout: 'GET /performance/workouts',
        getWorkoutByWeek: 'GET /performance/workouts/:year/:week',
        createWorkout: 'POST /performance/workouts (admin)'
      }
    });
  });

  // ===== RACE RESULTS =====

  // POST /performance/results - Upload race result
  app.post('/performance/results', (req: Request, res: Response) => {
    const userId = req.headers['x-user-id'] as string;
    const userEmail = req.headers['x-user-email'] as string;
    const { race_name, race_date, distance, time, pace, visibility } = req.body;

    console.log(`🏃 Uploading race result for user: ${userId}`);

    if (!race_name || !race_date || !distance || !time) {
      return res.status(400).json({
        error: 'Race name, date, distance, and time are required',
        code: 'VALIDATION_ERROR'
      });
    }

    const newResult = {
      id: `result-${Date.now()}`,
      user_id: userId || '123e4567-e89b-12d3-a456-426614174000',
      user_email: userEmail || 'user@example.com',
      race_name,
      race_date,
      distance,
      time,
      pace: pace || 'N/A',
      visibility: visibility || 'public',
      uploaded_at: new Date().toISOString()
    };

    mockResults.push(newResult);

    return res.status(201).json(newResult);
  });

  // GET /performance/results - Get user's race results
  app.get('/performance/results', (req: Request, res: Response) => {
    const userId = req.headers['x-user-id'] as string;
    const { from_date, to_date, distance } = req.query;

    console.log(`🏃 Getting results for user: ${userId}`);

    let userResults = mockResults.filter(r => r.user_id === userId);

    if (distance) {
      userResults = userResults.filter(r => r.distance === distance);
    }

    // If no results, return mock data
    if (userResults.length === 0) {
      userResults = [
        {
          id: 'result-mock-1',
          user_id: userId,
          race_name: 'Barcelona Half Marathon',
          race_date: '2024-10-15',
          distance: '21.1 km',
          time: '1:45:30',
          pace: '5:00 min/km',
          visibility: 'public',
          uploaded_at: '2024-10-15T14:00:00Z'
        }
      ];
    }

    res.json({
      results: userResults,
      filters: {
        from_date: from_date || null,
        to_date: to_date || null,
        distance: distance || null
      }
    });
  });

  // GET /performance/results/public - Get public race results (PUBLIC)
  app.get('/performance/results/public', (req: Request, res: Response) => {
    const { distance, from_date, to_date, page = 1, limit = 20 } = req.query;

    console.log(`🏃 Getting public race results`);

    // Filter public results
    let publicResults = mockResults.filter(r => r.visibility === 'public');

    if (distance) {
      publicResults = publicResults.filter(r => r.distance === distance);
    }

    // If no results, return mock data
    if (publicResults.length === 0) {
      publicResults = [
        {
          id: 'result-pub-1',
          user_email: 'runner1@example.com',
          race_name: 'Barcelona Marathon',
          race_date: '2024-10-20',
          distance: '42.2 km',
          time: '3:15:00',
          pace: '4:37 min/km'
        },
        {
          id: 'result-pub-2',
          user_email: 'runner2@example.com',
          race_name: 'Barcelona Half Marathon',
          race_date: '2024-10-15',
          distance: '21.1 km',
          time: '1:35:20',
          pace: '4:30 min/km'
        },
        {
          id: 'result-pub-3',
          user_email: 'runner3@example.com',
          race_name: 'Costa Brava 10K',
          race_date: '2024-10-10',
          distance: '10 km',
          time: '42:30',
          pace: '4:15 min/km'
        }
      ];
    }

    res.json({
      results: publicResults,
      filters: {
        distance: distance || null,
        from_date: from_date || null,
        to_date: to_date || null
      },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: publicResults.length,
        total_pages: Math.ceil(publicResults.length / Number(limit))
      }
    });
  });

  // ===== WORKOUTS =====

  // GET /performance/workouts - Get current week's workout (PUBLIC)
  app.get('/performance/workouts', (_req: Request, res: Response) => {
    console.log(`📅 Getting current week workout`);

    res.json(mockWorkouts[0]);
  });

  // GET /performance/workouts/:year/:week - Get specific week's workout (PUBLIC)
  app.get('/performance/workouts/:year/:week', (req: Request, res: Response) => {
    const { year, week } = req.params;

    console.log(`📅 Getting workout for week ${week} of ${year}`);

    const existingWorkout = mockWorkouts.find(
      w => w.year === Number(year) && w.week_number === Number(week)
    );

    if (existingWorkout) {
      return res.json(existingWorkout);
    }

    // Return mock workout
    return res.json({
      id: `workout-${year}-${week}`,
      week_number: Number(week),
      year: Number(year),
      title: `Week ${week} - Training Plan`,
      description: 'Weekly training schedule',
      published_date: `${year}-01-01T00:00:00Z`,
      workouts: [
        {
          day: 'Monday',
          type: 'Easy Run',
          duration: '40 min',
          intensity: 'Easy',
          description: 'Recovery pace'
        },
        {
          day: 'Wednesday',
          type: 'Intervals',
          duration: '45 min',
          intensity: 'Hard',
          description: '5x1000m at 5K pace'
        },
        {
          day: 'Saturday',
          type: 'Long Run',
          duration: '80 min',
          intensity: 'Easy',
          description: 'Long distance at easy pace'
        }
      ]
    });
  });

  // POST /performance/workouts - Create weekly workout (ADMIN)
  app.post('/performance/workouts', (req: Request, res: Response) => {
    const userRole = req.headers['x-user-role'] as string;
    const { week_number, year, title, description, workouts } = req.body;

    console.log(`📅 Creating workout for week ${week_number} of ${year}`);

    if (userRole !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden - Admin access required',
        code: 'FORBIDDEN'
      });
    }

    if (!week_number || !year || !title || !workouts) {
      return res.status(400).json({
        error: 'Week number, year, title, and workouts are required',
        code: 'VALIDATION_ERROR'
      });
    }

    if (!Array.isArray(workouts) || workouts.length === 0) {
      return res.status(400).json({
        error: 'Workouts must be a non-empty array',
        code: 'VALIDATION_ERROR'
      });
    }

    // Check if workout already exists
    const existingIndex = mockWorkouts.findIndex(
      w => w.year === year && w.week_number === week_number
    );

    const newWorkout = {
      id: `workout-${Date.now()}`,
      week_number,
      year,
      title,
      description: description || '',
      published_date: new Date().toISOString(),
      workouts
    };

    if (existingIndex !== -1) {
      // Replace existing
      mockWorkouts[existingIndex] = newWorkout;
      return res.json({
        message: 'Workout updated successfully',
        workout: newWorkout
      });
    }

    mockWorkouts.push(newWorkout);

    return res.status(201).json(newWorkout);
  });

  app.use('*', (req: Request, res: Response) => {
    res.status(404).json({
      error: 'Route not found',
      path: req.path,
      service: 'performance-service',
      available_endpoints: [
        'POST /performance/results',
        'GET /performance/results',
        'GET /performance/results/public',
        'GET /performance/workouts/current',
        'GET /performance/workouts/:year/:week',
        'POST /performance/workouts (admin)'
      ]
    });
  });

  startServer();

} else {
  console.log('🚀 Starting Performance Service in PRODUCTION mode with OAS Tools...');
  const { authMiddleware, isAdmin } = require('./middlewares/authMiddleware');

  // Import controller services
  const resultsController = require('./controllers/performanceresultsControllerService');
  const publicResultsController = require('./controllers/performanceresultspublicControllerService');
  const workoutsController = require('./controllers/performanceworkoutsControllerService');
  const workoutsByWeekController = require('./controllers/performanceworkoutsweekyearControllerService');

  // ===== PUBLIC ROUTES =====

  // GET /performance/results/public - Public race results (no auth)
  app.get('/performance/results/public', (req: Request, res: Response, next: NextFunction) => {
    publicResultsController.getPublicResults(req, res, next);
  });

  // GET /performance/workouts - Current week's workout (no auth)
  app.get('/performance/workouts', (req: Request, res: Response, next: NextFunction) => {
    workoutsController.getCurrentWorkout(req, res, next);
  });

  // GET /performance/workouts/:week/:year - Workout by week/year (no auth)
  app.get('/performance/workouts/:week/:year', (req: Request, res: Response, next: NextFunction) => {
    workoutsByWeekController.getWorkoutByWeek(req, res, next);
  });

  // ===== AUTHENTICATED USER ROUTES =====

  // POST /performance/results - Upload race result (requires auth)
  app.post('/performance/results', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
    resultsController.uploadRaceResult(req, res, next);
  });

  // GET /performance/results - Get user's own results (requires auth)
  app.get('/performance/results', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
    resultsController.getUserResults(req, res, next);
  });

  // PATCH /performance/results/:id - Update race result (owner only)
  app.patch('/performance/results/:id', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
    resultsController.updateRaceResult(req, res, next);
  });

  // DELETE /performance/results/:id - Delete race result (owner only)
  app.delete('/performance/results/:id', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
    resultsController.deleteRaceResult(req, res, next);
  });

  // ===== ADMIN-ONLY ROUTES =====

  // POST /performance/workouts - Create weekly workout (ADMIN only)
  app.post('/performance/workouts', authMiddleware, isAdmin, (req: Request, res: Response, next: NextFunction) => {
    workoutsController.createWorkout(req, res, next);
  });

  // PATCH /performance/workouts/:id - Update workout (ADMIN only)
  app.patch('/performance/workouts/:id', authMiddleware, isAdmin, (req: Request, res: Response, next: NextFunction) => {
    workoutsController.updateWorkout(req, res, next);
  });

  // DELETE /performance/workouts/:id - Delete workout (ADMIN only)
  app.delete('/performance/workouts/:id', authMiddleware, isAdmin, (req: Request, res: Response, next: NextFunction) => {
    workoutsController.deleteWorkout(req, res, next);
  });

  // ===== OAS TOOLS (docs + validation) =====

  const oasFilePath = path.resolve(__dirname, 'openapi', 'performance-service.yaml');

  if (!fs.existsSync(oasFilePath)) {
    console.warn(`⚠️  OpenAPI file not found: ${oasFilePath}`);
    console.warn('   Routes are still active. Only OAS docs/validation will be missing.');
    startServer();
  } else {
    const oasConfig = {
      oasFile: oasFilePath,
      useAnnotations: false,
      logger: { level: 'info' },
      middleware: {
        router: { controllers: path.join(process.cwd(), 'src', 'controllers') },
        validator: { strict: true, requestValidation: true, responseValidation: true },
        security: { auth: false }
      }
    };

    initialize(app, oasConfig)
      .then(() => startServer())
      .catch((err) => {
        console.error('❌ Error initializing OAS Tools:', err);
        startServer();
      });
  }
}

export default app;

