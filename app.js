const express = require('express');
const ejs = require('ejs');
const path = require('path'); // Added this line
const { initializeApp } = require('firebase/app');
const { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut
} = require('firebase/auth');
const { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  getDoc, // Added this import
  updateDoc, 
  deleteDoc 
} = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA5fiT8aQgcfX2I-c-xY1c_xvWFMuG0RWk",
  authDomain: "blood-donation-dfe5b.firebaseapp.com",
  projectId: "blood-donation-dfe5b",
  storageBucket: "blood-donation-dfe5b.appspot.com", // Fixed this line
  messagingSenderId: "197284585016",
  appId: "1:197284585016:web:c68a320a65990e72d250cd",
  measurementId: "G-GVEND7TKB1"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

const app = express();
const PORT = process.env.PORT || 3111;

// Middleware
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Set EJS as view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Authentication middleware
const checkAuth = (req, res, next) => {
  const user = auth.currentUser;
  if (user) {
    next();
  } else {
    res.redirect('/login');
  }
};

// Routes
app.get('/', checkAuth, (req, res) => {
  res.redirect('/dashboard');
});

app.get('/dashboard', checkAuth, async (req, res) => {
  try {
    // Get blood inventory
    const bloodSnapshot = await getDocs(collection(db, 'bloodInventory'));
    const bloodData = [];
    bloodSnapshot.forEach((doc) => {
      bloodData.push({ id: doc.id, ...doc.data() });
    });
    
    // Get donors
    const donorSnapshot = await getDocs(collection(db, 'donors'));
    const donors = [];
    donorSnapshot.forEach((doc) => {
      donors.push({ id: doc.id, ...doc.data() });
    });
    
    // Get blood requests
    const requestSnapshot = await getDocs(collection(db, 'bloodRequests'));
    const requests = [];
    requestSnapshot.forEach((doc) => {
      requests.push({ id: doc.id, ...doc.data() });
    });
    
    res.render('dashboard', { 
      bloodData, 
      donors, 
      requests,
      user: auth.currentUser 
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).send('Error loading dashboard');
  }
});

// Auth Routes
app.get('/login', (req, res) => {
  res.render('auth/login', { error: null, user: null });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Login error:', error);
    res.render('auth/login', { error: error.message });
  }
});

app.get('/signup', (req, res) => {
  res.render('auth/signup',{ error: null, user: null });
});

app.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Signup error:', error);
    res.render('auth/signup', { error: error.message });
  }
});

app.post('/logout', (req, res) => {
  signOut(auth).then(() => {
    res.redirect('/login');
  }).catch((error) => {
    console.error('Logout error:', error);
    res.redirect('/dashboard');
  });
});

// Blood Inventory CRUD Routes
app.get('/blood/add', checkAuth, (req, res) => {
  res.render('blood/add',{ error: null, user: null });
});

app.post('/blood/add', checkAuth, async (req, res) => {
  const { bloodType, unitsAvailable, donorInfo, collectionDate, expiryDate } = req.body;
  try {
    await addDoc(collection(db, 'bloodInventory'), {
      bloodType,
      unitsAvailable: parseInt(unitsAvailable),
      donorInfo,
      collectionDate,
      expiryDate,
      createdAt: new Date().toISOString()
    });
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Error adding blood:', error);
    res.render('blood/add', { error: error.message });
  }
});

app.get('/blood/edit/:id', checkAuth, async (req, res) => {
  try {
    const docRef = doc(db, 'bloodInventory', req.params.id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      res.render('blood/edit', { blood: docSnap.data(), id: req.params.id , error: null, 
        user: null});
    } else {
      res.status(404).render('404');
    }
  } catch (error) {
    console.error('Error fetching blood for edit:', error);
    res.status(500).send('Error loading edit page');
  }
});

app.post('/blood/edit/:id', checkAuth, async (req, res) => {
  const { bloodType, unitsAvailable, donorInfo, collectionDate, expiryDate } = req.body;
  try {
    const docRef = doc(db, 'bloodInventory', req.params.id);
    await updateDoc(docRef, {
      bloodType,
      unitsAvailable: parseInt(unitsAvailable),
      donorInfo,
      collectionDate,
      expiryDate,
      updatedAt: new Date().toISOString()
    });
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Error updating blood:', error);
    res.render('blood/edit', { 
      blood: req.body, 
      id: req.params.id, 
      error: error.message,
      error: null, 
      user: null
    }
  );
  }
});

app.post('/blood/delete/:id', checkAuth, async (req, res) => {
  try {
    await deleteDoc(doc(db, 'bloodInventory', req.params.id));
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Error deleting blood:', error);
    res.redirect('/dashboard');
  }
});

// Donor CRUD Routes
app.get('/donor/add', checkAuth, (req, res) => {
  res.render('donor/add', { error: null, user: auth.currentUser });
});

app.post('/donor/add', checkAuth, async (req, res) => {
  const { name, age, bloodType, contactInfo, unitsAvailable, collectionDate, donorInfo, expiryDate } = req.body;
  try {
    // Add donor to donors collection
    const donorRef = await addDoc(collection(db, 'donors'), {
      name,
      age: parseInt(age),
      bloodType,
      contactInfo,
      donationHistory: [{ date: collectionDate, units: parseInt(unitsAvailable) }],
      createdAt: new Date().toISOString()
    });
    
    // Add blood to inventory
    await addDoc(collection(db, 'bloodInventory'), {
      bloodType,
      unitsAvailable: parseInt(unitsAvailable),
      donorInfo: donorInfo || `${name} (${bloodType})`,
      collectionDate,
      expiryDate,
      donorId: donorRef.id,
      createdAt: new Date().toISOString()
    });
    
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Error adding donor:', error);
    res.render('donor/add', { error: error.message, user: auth.currentUser });
  }
});

app.get('/donor/edit/:id', checkAuth, async (req, res) => {
  try {
    const docRef = doc(db, 'donors', req.params.id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      res.render('donor/edit', { donor: docSnap.data(), id: req.params.id, error: null, user: null });
    } else {
      res.status(404).render('404');
    }
  } catch (error) {
    console.error('Error fetching donor for edit:', error);
    res.status(500).send('Error loading edit page');
  }
});

app.post('/donor/edit/:id', checkAuth, async (req, res) => {
  const { name, age, bloodType, contactInfo } = req.body;
  try {
    const docRef = doc(db, 'donors', req.params.id);
    await updateDoc(docRef, {
      name,
      age: parseInt(age),
      bloodType,
      contactInfo,
      updatedAt: new Date().toISOString()
    });
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Error updating donor:', error);
    res.render('donor/edit', { 
      donor: req.body, 
      id: req.params.id, 
      error: error.message,
      user: null
    });
  }
});

app.post('/donor/delete/:id', checkAuth, async (req, res) => {
  try {
    await deleteDoc(doc(db, 'donors', req.params.id));
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Error deleting donor:', error);
    res.redirect('/dashboard');
  }
});

// Add a new route for blood requests
app.get('/receiver/add', checkAuth, async (req, res) => {
  try {
    const querySnapshot = await getDocs(collection(db, 'bloodInventory'));
    const bloodData = [];
    querySnapshot.forEach((doc) => {
      bloodData.push({ id: doc.id, ...doc.data() });
    });
    res.render('receiver/add', { bloodData, error: null, user: auth.currentUser });
  } catch (error) {
    console.error('Error fetching blood data:', error);
    res.status(500).send('Error loading receivers page');
  }
});

app.post('/receiver/request', checkAuth, async (req, res) => {
  const { name, age, bloodType, contactInfo, units, urgency, bloodId } = req.body;
  try {
    // Add receiver to receivers collection
    const receiverRef = await addDoc(collection(db, 'receivers'), {
      name,
      age: parseInt(age),
      bloodType,
      contactInfo,
      createdAt: new Date().toISOString()
    });
    
    // Create blood request
    await addDoc(collection(db, 'bloodRequests'), {
      name,
      bloodType,
      units: parseInt(units),
      urgency,
      bloodId,
      receiverId: receiverRef.id,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Error processing blood request:', error);
    res.status(500).send('Error processing request');
  }
});

app.post('/request/approve/:id', checkAuth, async (req, res) => {
  try {
    const requestRef = doc(db, 'bloodRequests', req.params.id);
    const requestDoc = await getDoc(requestRef);
    
    if (requestDoc.exists()) {
      const requestData = requestDoc.data();
      
      // Update request status
      await updateDoc(requestRef, {
        status: 'approved',
        updatedAt: new Date().toISOString()
      });
      
      // Update blood inventory - reduce units
      if (requestData.bloodId) {
        const bloodDocRef = doc(db, 'bloodInventory', requestData.bloodId);
        const bloodDoc = await getDoc(bloodDocRef);
        
        if (bloodDoc.exists()) {
          const currentUnits = bloodDoc.data().unitsAvailable;
          const remainingUnits = Math.max(0, currentUnits - requestData.units);
          
          await updateDoc(bloodDocRef, {
            unitsAvailable: remainingUnits,
            updatedAt: new Date().toISOString()
          });
        }
      }
    }
    
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Error approving request:', error);
    res.redirect('/dashboard');
  }
});

app.post('/request/reject/:id', checkAuth, async (req, res) => {
  try {
    const requestRef = doc(db, 'bloodRequests', req.params.id);
    
    await updateDoc(requestRef, {
      status: 'rejected',
      updatedAt: new Date().toISOString()
    });
    
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Error rejecting request:', error);
    res.redirect('/dashboard');
  }
});

app.use((req, res) => {
  res.status(404).render('404', { user: auth.currentUser });
});

app.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}`);
});