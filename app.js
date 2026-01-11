// ResQ App JavaScript
class ResQApp {
    constructor() {
        this.currentScreen = 'home';
        this.isEmergencyActive = false;
        this.currentLocation = null;
        this.map = null;
        this.trackingMap = null;
        this.priorityLevel = 'Normal';
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupMaps();
        this.getLocation();
        this.setupBackgroundLocationTracking();
        this.updateUI();
    }
    
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const screen = link.getAttribute('data-screen');
                this.switchScreen(screen);
            });
        });
        
        // Emergency button
        document.getElementById('start-emergency-btn').addEventListener('click', () => {
            this.startEmergency();
        });
        
        // SOS button
        document.getElementById('sos-btn').addEventListener('click', () => {
            this.triggerSOS();
        });
        
        // Priority level selection
        const prioritySelect = document.getElementById('priority-level');
        if (prioritySelect) {
            prioritySelect.addEventListener('change', (e) => {
                this.priorityLevel = e.target.value;
                this.updatePriorityIndicator();
            });
        }
        
        // Refresh location button
        const refreshLocationBtn = document.getElementById('refresh-location');
        if (refreshLocationBtn) {
            refreshLocationBtn.addEventListener('click', () => {
                this.getLocation();
            });
        }
        
        // Back buttons
        document.getElementById('back-to-home').addEventListener('click', () => {
            this.switchScreen('home');
        });
        
        document.getElementById('back-to-home-status').addEventListener('click', () => {
            this.switchScreen('home');
        });
    }
    
    setupMaps() {
        // Home screen map
        this.map = L.map('map').setView([12.9716, 77.5946], 15); // Default to Bangalore
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.map);
        
        // Tracking screen map
        this.trackingMap = L.map('tracking-map').setView([12.9716, 77.5946], 15);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.trackingMap);
    }
    
    getLocation() {
        if (navigator.geolocation) {
            // Options for high accuracy
            const options = {
                enableHighAccuracy: true,
                timeout: 30000, // 30 seconds to allow for better GPS signal acquisition
                maximumAge: 0 // No caching - get fresh location
            };
            
            // Watch for continuous location updates
            this.watchId = navigator.geolocation.watchPosition(
                (position) => {
                    this.currentLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        altitude: position.coords.altitude,
                        speed: position.coords.speed,
                        heading: position.coords.heading,
                        timestamp: position.timestamp
                    };
                    
                    // Update both maps with current location
                    this.map.setView([this.currentLocation.lat, this.currentLocation.lng], 17); // Higher zoom for more precision
                    this.trackingMap.setView([this.currentLocation.lat, this.currentLocation.lng], 17); // Higher zoom for more precision
                    
                    // Clear existing location markers
                    if (this.locationMarker) {
                        this.map.removeLayer(this.locationMarker);
                        this.trackingMap.removeLayer(this.locationMarkerTracking);
                    }
                    
                    // Add marker to maps with accuracy circle
                    this.locationMarker = L.marker([this.currentLocation.lat, this.currentLocation.lng]).addTo(this.map);
                    
                    // Add accuracy circle
                    if (this.currentLocation.accuracy) {
                        L.circle([this.currentLocation.lat, this.currentLocation.lng], {
                            radius: this.currentLocation.accuracy,
                            color: '#4a90e2',
                            fillColor: '#4a90e2',
                            fillOpacity: 0.2
                        }).addTo(this.map).bindPopup(`Your Location (Accuracy: ${Math.round(this.currentLocation.accuracy)} meters)`);
                    }
                    
                    this.locationMarker.bindPopup('Your Location').openPopup();
                    
                    this.locationMarkerTracking = L.marker([this.currentLocation.lat, this.currentLocation.lng]).addTo(this.trackingMap);
                    
                    // Add accuracy circle to tracking map as well
                    if (this.currentLocation.accuracy) {
                        L.circle([this.currentLocation.lat, this.currentLocation.lng], {
                            radius: this.currentLocation.accuracy,
                            color: '#4a90e2',
                            fillColor: '#4a90e2',
                            fillOpacity: 0.2
                        }).addTo(this.trackingMap).bindPopup(`Current Position (Accuracy: ${Math.round(this.currentLocation.accuracy)} meters)`);
                    }
                    
                    this.locationMarkerTracking.bindPopup('Current Position').openPopup();
                    
                    // Update location display
                    this.updateLocationDisplay();
                    
                    // Update nearby police and hospitals
                    this.findNearbyPolice();
                    this.findNearbyHospitals();
                },
                (error) => {
                    console.error('Error getting location:', error);
                    
                    // Attempt to recover from location errors
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            document.getElementById('user-location').textContent = 'Location access denied. Please enable location services.';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            document.getElementById('user-location').textContent = 'Location information unavailable.';
                            break;
                        case error.TIMEOUT:
                            document.getElementById('user-location').textContent = 'Location request timed out. Retrying...';
                            // Retry location request after delay
                            setTimeout(() => {
                                this.getLocation();
                            }, 5000);
                            break;
                        default:
                            document.getElementById('user-location').textContent = 'An unknown error occurred. Retrying...';
                            // Retry location request after delay
                            setTimeout(() => {
                                this.getLocation();
                            }, 5000);
                            break;
                    }
                    
                    // Keep trying to get location even after errors
                    if (!this.currentLocation) {
                        // Fallback to default location
                        this.currentLocation = {
                            lat: 12.9716, // Default to Bangalore
                            lng: 77.5946
                        };
                        
                        this.map.setView([this.currentLocation.lat, this.currentLocation.lng]);
                        this.trackingMap.setView([this.currentLocation.lat, this.currentLocation.lng]);
                    }
                },
                options
            );
        } else {
            document.getElementById('user-location').textContent = 'Geolocation not supported';
        }
    }
    
    // Enhanced location tracking with background persistence
    setupBackgroundLocationTracking() {
        // Request permission to use location in background
        if (navigator.permissions) {
            navigator.permissions.query({name: 'geolocation'}).then(permission => {
                if (permission.state === 'denied') {
                    document.getElementById('user-location').textContent = 'Location permission denied. Please enable in settings.';
                }
            });
        }
        
        // Set up periodic location updates even when app is in background
        setInterval(() => {
            if (this.currentLocation) {
                // Update UI with current location even when in background
                this.updateLocationDisplay();
            }
        }, 10000); // Update every 10 seconds
        
        // Listen for visibility changes to handle app coming back to foreground
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.currentLocation) {
                // Refresh location when app comes back to foreground
                this.getLocation();
            }
        });
    }
    
    updateLocationDisplay() {
        if (this.currentLocation) {
            if (this.currentLocation.accuracy) {
                document.getElementById('user-location').textContent = 
                    `Lat: ${this.currentLocation.lat.toFixed(6)}, Lng: ${this.currentLocation.lng.toFixed(6)} (±${Math.round(this.currentLocation.accuracy)}m)`;
            } else {
                document.getElementById('user-location').textContent = 
                    `Lat: ${this.currentLocation.lat.toFixed(6)}, Lng: ${this.currentLocation.lng.toFixed(6)}`;
            }
            
            // Find and display nearby hospitals
            this.findNearbyHospitals();
        }
    }
    
    switchScreen(screenName) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Show selected screen
        document.getElementById(`${screenName}-screen`).classList.add('active');
        
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        document.querySelector(`[data-screen="${screenName}"]`).closest('.nav-item').classList.add('active');
        
        this.currentScreen = screenName;
    }
    
    // Method to clean up location watching when app is destroyed
    destroy() {
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
        }
    }
    
    startEmergency() {
        if (!this.isEmergencyActive) {
            this.isEmergencyActive = true;
            this.updatePriorityLevel();
            
            // Update UI
            const emergencyBtn = document.getElementById('start-emergency-btn');
            emergencyBtn.innerHTML = '<span class="btn-icon">EMERGENCY</span><span class="btn-text">Emergency Active</span>';
            emergencyBtn.style.background = 'linear-gradient(135deg, #ff8c00, #ff6347)';
            emergencyBtn.disabled = true;
            
            document.getElementById('status-text').textContent = 'Emergency in progress - Help is on the way';
            
            // Simulate sending location to control room and traffic police
            this.sendLocationToControlRoom();
            this.sendLocationToTrafficPolice();
            
            // Update status timeline
            this.addStatusUpdate('Emergency Started', 'Location shared with control room and nearby traffic police');
            
            // Simulate ambulance dispatch after a delay
            setTimeout(() => {
                this.addStatusUpdate('Ambulance Dispatched', 'Ambulance #ABC-123 assigned and en route');
            }, 3000);
            
            // Simulate en route status
            setTimeout(() => {
                this.addStatusUpdate('En Route to Hospital', 'Patient is stable, estimated arrival in 10 minutes');
            }, 6000);
            
            // Additional status updates for more comprehensive timeline
            setTimeout(() => {
                this.addStatusUpdate('Traffic Alert', 'Notification sent to traffic police to clear path');
            }, 4000);
            
            setTimeout(() => {
                this.addStatusUpdate('Hospital Notified', 'Destination hospital prepared for patient arrival');
            }, 8000);
        }
    }
    
    triggerSOS() {
        // High priority alert
        this.priorityLevel = 'Critical';
        this.updatePriorityIndicator();
        
        // Visual feedback
        const sosBtn = document.getElementById('sos-btn');
        sosBtn.innerHTML = '<span class="sos-icon">SOS ALERT</span><span>SOS ALERT SENT</span>';
        sosBtn.style.background = 'linear-gradient(135deg, #ff4500, #ff6347)';
        
        // Add SOS status update
        this.addStatusUpdate('SOS Alert Sent', 'Priority alert sent to all nearby traffic police and control room');
        
        // Simulate notification to traffic police to clear path
        this.notifyTrafficPoliceForPathClearing();
        
        // Revert button after delay
        setTimeout(() => {
            sosBtn.innerHTML = '<span class="sos-icon">SOS</span><span>SOS Alert</span>';
            sosBtn.style.background = 'linear-gradient(135deg, #4a90e2, #5fa9f9)';
        }, 3000);
    }
    
    updatePriorityLevel() {
        // Simple AI-based priority calculation based on various factors
        // In a real app, this would be more sophisticated
        const factors = {
            timeOfDay: this.getTimeFactor(),
            location: this.getLocationFactor(),
            traffic: this.getTrafficFactor()
        };
        
        // Calculate priority based on factors
        let priorityScore = 0;
        for (let factor in factors) {
            priorityScore += factors[factor];
        }
        
        if (priorityScore > 7) {
            this.priorityLevel = 'Critical';
        } else if (priorityScore > 4) {
            this.priorityLevel = 'High';
        } else {
            this.priorityLevel = 'Normal';
        }
        
        this.updatePriorityIndicator();
    }
    
    getTimeFactor() {
        const hour = new Date().getHours();
        // Higher priority during night hours when fewer resources available
        if (hour < 6 || hour > 22) return 3;
        return 1;
    }
    
    getLocationFactor() {
        // In real app, this would check if location is in remote area
        // For demo, return random value
        return Math.random() > 0.5 ? 2 : 1;
    }
    
    getTrafficFactor() {
        // In real app, this would check current traffic conditions
        // For demo, return random value
        return Math.random() > 0.7 ? 3 : 1;
    }
    
    updatePriorityIndicator() {
        const indicator = document.getElementById('priority-indicator');
        indicator.textContent = this.priorityLevel;
        
        // Update class based on priority
        switch(this.priorityLevel) {
            case 'Critical':
                indicator.className = 'priority-indicator critical-priority';
                break;
            case 'High':
                indicator.className = 'priority-indicator high-priority';
                break;
            case 'Normal':
            default:
                indicator.className = 'priority-indicator normal-priority';
                break;
        }
    }
    
    sendLocationToControlRoom() {
        console.log('Sending location to control room:', this.currentLocation);
        // In a real app, this would send data to a backend server
    }
    
    sendLocationToTrafficPolice() {
        console.log('Sending location to traffic police:', this.currentLocation);
        // In a real app, this would send data to traffic police systems
    }
    
    findNearbyPolice() {
        // Simulate finding nearby traffic police
        const policeList = document.getElementById('police-list');
        policeList.innerHTML = ''; // Clear existing list
        
        // Generate mock police data
        const policeOfficers = [
            { id: 'A123', distance: '0.5 km away', lat: this.currentLocation.lat + 0.002, lng: this.currentLocation.lng + 0.002 },
            { id: 'B456', distance: '1.2 km away', lat: this.currentLocation.lat - 0.003, lng: this.currentLocation.lng + 0.001 },
            { id: 'C789', distance: '1.8 km away', lat: this.currentLocation.lat + 0.001, lng: this.currentLocation.lng - 0.004 }
        ];
        
        policeOfficers.forEach(police => {
            const li = document.createElement('li');
            li.className = 'police-item';
            li.innerHTML = `
                <span>Police Officer #${police.id}</span>
                <span class="distance">${police.distance}</span>
            `;
            policeList.appendChild(li);
            
            // Add police marker to tracking map
            L.marker([police.lat, police.lng]).addTo(this.trackingMap)
                .bindPopup(`Police Officer #${police.id}`)
                .openPopup();
        });
    }
    
    findNearbyHospitals() {
        // Find real nearby hospitals using OpenStreetMap Nominatim API
        const hospitalList = document.getElementById('hospital-list');
        if (!hospitalList) return;
        
        if (!this.currentLocation) {
            hospitalList.innerHTML = '<div class="no-hospitals">Waiting for location...</div>';
            return;
        }
        
        // Store current location for comparison
        const currentLat = this.currentLocation.lat;
        const currentLng = this.currentLocation.lng;
        
        // Check if we have cached data for this location
        const cacheKey = `hospitals_${Math.round(currentLat * 1000)}_${Math.round(currentLng * 1000)}`;
        const cachedData = localStorage.getItem(cacheKey);
        
        if (cachedData) {
            try {
                const cachedHospitals = JSON.parse(cachedData);
                // Display cached data immediately
                this.displayHospitals(hospitalList, cachedHospitals);
            } catch (e) {
                console.warn('Failed to parse cached hospital data');
            }
        }
        
        // Add loading indicator
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-hospitals';
        loadingDiv.textContent = 'Loading hospital information...';
        hospitalList.appendChild(loadingDiv);
        
        // Use Overpass API to find real hospitals near current location
        const overpassQuery = `[out:json];(node[amenity=hospital][name](around:3000,${currentLat},${currentLng});way[amenity=hospital][name](around:3000,${currentLat},${currentLng});relation[amenity=hospital][name](around:3000,${currentLat},${currentLng}););out body;>;out skel qt;`;
        
        const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;
        
        // Set a timeout for emergency situations
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
        
        fetch(overpassUrl, { signal: controller.signal })
            .then(response => response.json())
            .then(data => {
                clearTimeout(timeoutId);
                
                // Remove loading indicator
                const loadingElements = hospitalList.querySelectorAll('.loading-hospitals');
                loadingElements.forEach(el => el.remove());
                
                if (data.elements && data.elements.length > 0) {
                    // Process the hospital data
                    const hospitals = [];
                    
                    data.elements.forEach(element => {
                        if (element.tags && element.tags.name) {
                            const lat = element.lat || (element.center ? element.center.lat : null);
                            const lng = element.lon || (element.center ? element.center.lon : null);
                            
                            if (lat && lng) {
                                // Calculate distance using haversine formula
                                const distance = this.calculateDistance(
                                    currentLat, 
                                    currentLng, 
                                    lat, 
                                    lng
                                );
                                
                                hospitals.push({
                                    name: element.tags.name,
                                    distance: `${distance.toFixed(1)} km away`,
                                    lat: lat,
                                    lng: lng,
                                    tags: element.tags
                                });
                            }
                        }
                    });
                    
                    // Sort hospitals by distance
                    hospitals.sort((a, b) => {
                        const distA = parseFloat(a.distance.split(' ')[0]);
                        const distB = parseFloat(b.distance.split(' ')[0]);
                        return distA - distB;
                    });
                    
                    // Display only the closest 5 hospitals
                    const closestHospitals = hospitals.slice(0, 5);
                    
                    if (closestHospitals.length === 0) {
                        const noHospitals = document.createElement('div');
                        noHospitals.className = 'no-hospitals';
                        noHospitals.textContent = 'No hospitals found nearby';
                        hospitalList.appendChild(noHospitals);
                        return;
                    }
                    
                    // Cache the results for this location
                    try {
                        localStorage.setItem(cacheKey, JSON.stringify(closestHospitals));
                    } catch (e) {
                        console.warn('Failed to cache hospital data');
                    }
                    
                    // Display the hospitals
                    this.displayHospitals(hospitalList, closestHospitals);
                } else {
                    // Show fallback hospitals if API returns no results
                    this.showFallbackHospitals(hospitalList);
                }
            })
            .catch(error => {
                clearTimeout(timeoutId);
                
                // Remove loading indicator
                const loadingElements = hospitalList.querySelectorAll('.loading-hospitals');
                loadingElements.forEach(el => el.remove());
                
                // Always show fallback hospitals on error
                this.showFallbackHospitals(hospitalList);
            });
    }
    
    displayHospitals(hospitalList, hospitals) {
        // Remove existing hospital markers
        if (this.hospitalMarkers) {
            this.hospitalMarkers.forEach(marker => {
                this.map.removeLayer(marker);
            });
        }
        this.hospitalMarkers = [];
        
        // Clear only the hospital items, not other content
        const hospitalItems = hospitalList.querySelectorAll('.hospital-item, .no-hospitals');
        hospitalItems.forEach(item => item.remove());
        
        hospitals.forEach(hospital => {
            const hospitalItem = document.createElement('div');
            hospitalItem.className = 'hospital-item';
            
            // Determine if hospital is likely open based on healthcare facility tags
            const isOpen = hospital.tags.amenity === 'hospital' || hospital.tags.healthcare === 'hospital';
            const statusClass = isOpen ? 'open' : 'unknown';
            const statusText = isOpen ? 'Open' : 'Status Unknown';
            
            hospitalItem.innerHTML = `
                <div class="hospital-info">
                    <div class="hospital-name">${hospital.name}</div>
                    <div class="hospital-distance">${hospital.distance}</div>
                </div>
                <div class="hospital-status ${statusClass}">${statusText}</div>
            `;
            
            hospitalList.appendChild(hospitalItem);
            
            // Add hospital marker to map
            const markerIcon = L.divIcon({
                className: 'hospital-marker',
                html: '<div style="background-color: #4CAF50; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-weight: bold;">H</div>',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });
            
            const marker = L.marker([hospital.lat, hospital.lng], { icon: markerIcon }).addTo(this.map)
                .bindPopup(`<b>${hospital.name}</b><br>${statusText}<br>${hospital.distance} away`);
            
            this.hospitalMarkers.push(marker);
        });
    }
    
    notifyTrafficPoliceForPathClearing() {
        console.log('Notifying traffic police to clear path for ambulance');
        // In a real app, this would send notifications to traffic police systems
    }
    
    addStatusUpdate(title, description) {
        const timestamp = new Date().toLocaleTimeString();
        
        // Add to the status screen timeline
        const statusUpdatesContainer = document.querySelector('.status-updates');
        
        if (statusUpdatesContainer) {
            const statusItem = document.createElement('div');
            statusItem.className = 'status-item';
            
            // Determine the icon based on the title
            let icon = 'LOCATION';
            if (title.includes('SOS') || title.includes('Alert')) {
                icon = 'SOS';
            } else if (title.includes('Ambulance')) {
                icon = 'AMBULANCE';
            } else if (title.includes('Hospital') || title.includes('En route')) {
                icon = 'HOSPITAL';
            } else if (title.includes('Emergency')) {
                icon = 'EMERGENCY';
            }
            
            statusItem.innerHTML = `
                <div class="status-icon">${icon}</div>
                <div class="status-content">
                    <h3>${title}</h3>
                    <p>${description}</p>
                    <span class="timestamp">${timestamp}</span>
                </div>
            `;
            
            // Add to the beginning of the container to show newest first
            if (statusUpdatesContainer.firstChild) {
                statusUpdatesContainer.insertBefore(statusItem, statusUpdatesContainer.firstChild);
            } else {
                statusUpdatesContainer.appendChild(statusItem);
            }
        }
        
        // Add to the home screen recent updates
        const homeUpdatesContainer = document.getElementById('home-status-updates');
        
        if (homeUpdatesContainer) {
            const homeStatusItem = document.createElement('div');
            homeStatusItem.className = 'home-status-item';
            
            // Determine the icon for home screen
            let homeIcon = 'LOCATION';
            if (title.includes('SOS') || title.includes('Alert')) {
                homeIcon = 'SOS';
            } else if (title.includes('Ambulance')) {
                homeIcon = 'AMBULANCE';
            } else if (title.includes('Hospital') || title.includes('En route')) {
                homeIcon = 'HOSPITAL';
            } else if (title.includes('Emergency')) {
                homeIcon = 'EMERGENCY';
            }
            
            homeStatusItem.innerHTML = `
                <span class="home-status-icon">${homeIcon}</span>
                <span class="home-status-text">${description}</span>
                <span class="home-status-time">${timestamp}</span>
            `;
            
            // Add to the beginning of the container to show newest first
            if (homeUpdatesContainer.firstChild) {
                homeUpdatesContainer.insertBefore(homeStatusItem, homeUpdatesContainer.firstChild);
            } else {
                homeUpdatesContainer.appendChild(homeStatusItem);
            }
            
            // Limit to 5 items to prevent overflow
            if (homeUpdatesContainer.children.length > 5) {
                homeUpdatesContainer.removeChild(homeUpdatesContainer.lastChild);
            }
        }
        
        // Also update the main home screen status for immediate visibility
        const homeStatusElement = document.getElementById('status-text');
        if (homeStatusElement) {
            homeStatusElement.textContent = description;
        }
        
        console.log(`Status Update: ${title} - ${description}`);
    }
    
    // Helper function to calculate distance between two coordinates using Haversine formula
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        return distance;
    }
    
    showFallbackHospitals(hospitalList) {
        // Remove loading indicator
        const loadingElements = hospitalList.querySelectorAll('.loading-hospitals');
        loadingElements.forEach(el => el.remove());
        
        // Define emergency fallback hospitals
        const fallbackHospitals = [
            { name: 'General Hospital', distance: '0.8 km away', lat: this.currentLocation.lat + 0.001, lng: this.currentLocation.lng + 0.001 },
            { name: 'City Medical Center', distance: '1.2 km away', lat: this.currentLocation.lat - 0.001, lng: this.currentLocation.lng - 0.001 },
            { name: 'District Hospital', distance: '1.5 km away', lat: this.currentLocation.lat + 0.002, lng: this.currentLocation.lng - 0.002 }
        ];
        
        // Display fallback hospitals
        this.displayHospitals(hospitalList, fallbackHospitals.map(h => ({
            name: h.name,
            distance: h.distance,
            lat: h.lat,
            lng: h.lng,
            tags: { amenity: 'hospital' }
        })));
    }
    
    updateUI() {
        // Update UI elements based on current state
        this.updatePriorityIndicator();
    }
}

// Initialize the app when the page loads
window.addEventListener('load', () => {
    // Show the app after a short delay to allow the splash screen animation
    setTimeout(() => {
        const splashScreen = document.getElementById('splash-screen');
        const appContainer = document.getElementById('app');
        
        // Add the loaded class to the app container to fade it in
        appContainer.classList.add('loaded');
        
        // Hide the splash screen with animation
        splashScreen.classList.add('hidden');
        
        // Initialize the app after the splash screen animation
        setTimeout(() => {
            new ResQApp();
        }, 500);
    }, 2500); // Show splash screen for 2.5 seconds
});

// Additional utility functions for route optimization and regional language support
class RouteOptimizer {
    static findFastestRoute(start, end, trafficData) {
        // In a real app, this would use routing algorithms and live traffic data
        // For demo, return a mock route
        return {
            distance: '5.2 km',
            estimatedTime: '8 min',
            steps: [
                'Head north on Main St',
                'Turn right on Hospital Rd',
                'Arrive at General Hospital'
            ]
        };
    }
}

// Regional language support
class LanguageSupport {
    constructor() {
        this.currentLanguage = 'en';
        this.supportedLanguages = ['en', 'hi', 'kn', 'ta', 'te']; // English, Hindi, Kannada, Tamil, Telugu
    }
    
    setLanguage(lang) {
        if (this.supportedLanguages.includes(lang)) {
            this.currentLanguage = lang;
            this.updateInterface();
        }
    }
    
    updateInterface() {
        // Update UI text based on selected language
        // Implementation would update all text elements
    }
    
    translate(text) {
        // In a real app, this would return translated text
        // For demo, return original text
        return text;
    }
}