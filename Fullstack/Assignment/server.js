const express = require('express');
const mongoose = require('mongoose');

const PORT = process.env.PORT || 5000;
const DB_URL =
  process.env.MONGO_URI ||
  'mongodb+srv://alphacoder302_db_user:MediKiosk2026Test@cluster1.wzdcrvi.mongodb.net/campus_events?retryWrites=true&w=majority';

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const COLLEGE_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@(?:[a-zA-Z0-9-]+\.)+(?:edu|ac\.in)$/;
const ROLL_NUMBER_REGEX = /^[A-Z0-9]{8,10}$/;

const ALLOWED_EVENTS = ['CODING_HACKATHON', 'AI_WORKSHOP', 'ROBOTICS', 'GAMING'];
const ALLOWED_STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED'];
const ALLOWED_FIELDS = [
  'studentName',
  'collegeEmail',
  'rollNumber',
  'eventType',
  'teamSize',
  'ticketPrice',
  'discountCode',
  'status'
];

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

const reqField = (name) => [true, `${name} is required`];

const filterKeys = (source, keys) =>
  keys.reduce((acc, key) => {
    if (source[key] !== undefined) acc[key] = source[key];
    return acc;
  }, {});

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const checkObjectId = (id) => {
  if (!OBJECT_ID_REGEX.test(String(id))) {
    throw new HttpError(400, 'Invalid registration ID format');
  }
};

const registrationSchema = new mongoose.Schema(
  {
    studentName: {
      type: String,
      required: reqField('studentName'),
      trim: true,
      minlength: [3, 'Student name must be at least 3 characters'],
      maxlength: [50, 'Student name cannot exceed 50 characters']
    },
    collegeEmail: {
      type: String,
      required: reqField('collegeEmail'),
      unique: true,
      trim: true,
      lowercase: true,
      match: [COLLEGE_EMAIL_REGEX, 'Must be a valid college email ending in .edu or .ac.in']
    },
    rollNumber: {
      type: String,
      required: reqField('rollNumber'),
      trim: true,
      uppercase: true,
      match: [ROLL_NUMBER_REGEX, 'Roll number must be alphanumeric and exactly 8 to 10 characters']
    },
    eventType: {
      type: String,
      required: reqField('eventType'),
      enum: {
        values: ALLOWED_EVENTS,
        message: '{VALUE} is not a valid event type'
      }
    },
    teamSize: {
      type: Number,
      required: reqField('teamSize'),
      min: [1, 'Team size must be at least 1'],
      max: [4, 'Team size cannot exceed 4'],
      validate: {
        validator: (v) => Number.isInteger(v),
        message: 'Team size must be an integer'
      }
    },
    ticketPrice: {
      type: Number,
      required: reqField('ticketPrice'),
      min: [0, 'Ticket price cannot be negative']
    },
    discountCode: {
      type: String,
      trim: true,
      uppercase: true
    },
    finalAmount: {
      type: Number,
      min: [0, 'Final amount cannot be negative']
    },
    status: {
      type: String,
      enum: {
        values: ALLOWED_STATUSES,
        message: '{VALUE} is not a valid status'
      },
      default: 'PENDING'
    },
    registrationDate: {
      type: Date,
      default: Date.now,
      validate: {
        validator: (v) => v.getTime() <= Date.now(),
        message: 'Registration date cannot be a future date'
      }
    }
  },
  {
    versionKey: false,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        return ret;
      }
    }
  }
);

registrationSchema.pre('validate', function () {
  if (this.eventType === 'AI_WORKSHOP' && this.teamSize > 1) {
    this.invalidate('teamSize', 'AI Workshop only permits individual registrations', this.teamSize);
  }

  const price = this.ticketPrice;
  if (typeof price !== 'number' || Number.isNaN(price)) return;

  const code = this.discountCode ? this.discountCode.trim().toUpperCase() : null;

  if (!code) {
    this.finalAmount = price;
  } else if (code === 'CAMPUS50') {
    this.finalAmount = price * 0.5;
  } else if (code === 'EARLYBIRD') {
    this.finalAmount = Math.max(price - 100, 0);
  } else {
    this.invalidate('discountCode', 'Invalid discount code', this.discountCode);
  }
});

const Registration = mongoose.model('Registration', registrationSchema);

const router = express.Router();

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = filterKeys(req.body || {}, ALLOWED_FIELDS);
    const doc = await Registration.create(payload);
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: doc
    });
  })
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.eventType) filter.eventType = String(req.query.eventType).toUpperCase();
    if (req.query.status) filter.status = String(req.query.status).toUpperCase();

    const list = await Registration.find(filter).sort({ registrationDate: -1 });
    res.status(200).json({
      success: true,
      count: list.length,
      data: list
    });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    checkObjectId(req.params.id);
    const doc = await Registration.findById(req.params.id);
    if (!doc) throw new HttpError(404, 'Registration not found');

    res.status(200).json({
      success: true,
      data: doc
    });
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    checkObjectId(req.params.id);

    const existing = await Registration.findById(req.params.id);
    if (!existing) throw new HttpError(404, 'Registration not found');

    const updates = filterKeys(req.body || {}, ALLOWED_FIELDS);
    if (Object.keys(updates).length === 0) {
      throw new HttpError(400, 'No updatable fields provided');
    }

    const merged = { ...existing.toObject(), ...updates };
    delete merged._id;
    delete merged.id;
    delete merged.finalAmount;

    const tempDoc = new Registration(merged);
    await tempDoc.validate();
    merged.finalAmount = tempDoc.finalAmount;

    const updated = await Registration.findByIdAndUpdate(req.params.id, merged, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      message: 'Registration updated successfully',
      data: updated
    });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    checkObjectId(req.params.id);
    const deleted = await Registration.findByIdAndDelete(req.params.id);
    if (!deleted) throw new HttpError(404, 'Registration not found');

    res.status(200).json({
      success: true,
      message: 'Registration deleted successfully'
    });
  })
);

const app = express();

app.use(express.json());
app.use('/api/registrations', router);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use((err, req, res, next) => {
  if (err && err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'This email is already registered for the event'
    });
  }

  if (err && err.name === 'ValidationError') {
    const errorList = Object.values(err.errors).map((e) =>
      e.name === 'CastError' ? `${e.path} has an invalid value` : e.message
    );
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorList
    });
  }

  if (err && err.name === 'CastError') {
    const msg = err.path === '_id' ? 'Invalid registration ID format' : `${err.path} has an invalid value`;
    return res.status(400).json({
      success: false,
      message: msg
    });
  }

  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON body'
    });
  }

  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message
    });
  }

  console.error(err);
  return res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

mongoose
  .connect(DB_URL)
  .then(() => Registration.init())
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });
