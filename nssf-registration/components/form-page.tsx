// @ts-nocheck
'use client';

import React, { useState, useEffect, useRef } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { usePathname, useSearchParams } from 'next/navigation';
import { Analytics } from '@vercel/analytics/react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileIcon, UserIcon, Clock, CheckCircle, ArrowLeft, Download, RefreshCw, Users } from 'lucide-react';

// Step indicator component
const StepIndicator = ({ currentStep }: { currentStep: number }) => {
  return (
    <div className="flex justify-between items-center w-full py-2">
      <div className={`flex items-center ${currentStep >= 1 ? 'text-primary' : 'text-gray-400'}`}>
        <div className={`flex items-center justify-center w-8 h-8 rounded-full mr-2 ${currentStep >= 1 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>
          <UserIcon className="h-4 w-4" />
        </div>
        <span className="text-sm font-medium hidden sm:inline">Personal Info</span>
      </div>

      <div className={`flex-1 h-1 mx-2 ${currentStep >= 2 ? 'bg-primary' : 'bg-gray-200'}`}></div>

      <div className={`flex items-center ${currentStep >= 2 ? 'text-primary' : 'text-gray-400'}`}>
        <div className={`flex items-center justify-center w-8 h-8 rounded-full mr-2 ${currentStep >= 2 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>
          <Clock className="h-4 w-4" />
        </div>
        <span className="text-sm font-medium hidden sm:inline">Processing</span>
      </div>

      <div className={`flex-1 h-1 mx-2 ${currentStep >= 3 ? 'bg-primary' : 'bg-gray-200'}`}></div>

      <div className={`flex items-center ${currentStep >= 3 ? 'text-primary' : 'text-gray-400'}`}>
        <div className={`flex items-center justify-center w-8 h-8 rounded-full mr-2 ${currentStep >= 3 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>
          <CheckCircle className="h-4 w-4" />
        </div>
        <span className="text-sm font-medium hidden sm:inline">Complete</span>
      </div>
    </div>
  );
};

// Visitor Count component
function VisitorCount({ count }) {
  return (
    <div className="flex items-center text-sm text-muted-foreground">
      <Users className="h-4 w-4 mr-1" />
      <p>Total Visitors: {count}</p>
    </div>
  );
}

// Registration Count component
function RegistrationCount({ count }) {
  return (
    <div className="flex items-center text-sm text-muted-foreground">
      <CheckCircle className="h-4 w-4 mr-1" />
      <p>Completed Registrations: {count}</p>
    </div>
  );
}

export function FormPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    surname: '',
    idNumber: '',
    dateOfBirth: '',
    districtOfBirth: '',
    mobileNumber: '',
    email: ''
  });

  // State variables for the form and process
  const [pdfData, setPdfData] = useState(null);
  const [visitorCount, setVisitorCount] = useState(0);
  const [completedRegistrations, setCompletedRegistrations] = useState(0);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle');
  const [requestId, setRequestId] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [captchaImage, setCaptchaImage] = useState('');
  const [captchaText, setCaptchaText] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [processingError, setProcessingError] = useState(null);
  const [captchaChunks, setCaptchaChunks] = useState([]);
  const [expectedChunks, setExpectedChunks] = useState(0);

  // References for cleanup
  const wsRef = useRef(null);
  const pollIntervalRef = useRef(null);

  // Clean up WebSocket connection when component unmounts
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  // Track page view and analytics
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Track page views using Vercel Analytics
  useEffect(() => {
    const url = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ''}`;
    
    // This fires a page view event in Vercel Analytics
    const handleRouteChange = () => {
      // You can access analytics data through the Vercel Analytics dashboard
      console.log('Page view tracked:', url);
    };
    
    handleRouteChange();
    
    // For demo purposes, we'll still show some numbers
    // In production, these would come from Vercel Analytics API
    const fetchVisitorStats = async () => {
      try {
        // In production, you would use Vercel Analytics API
        // or a database that stores the analytics data
        const visitorData = localStorage.getItem('visitorCount');
        const registrationData = localStorage.getItem('registrationCount');
        
        let visitors = visitorData ? parseInt(visitorData) : 150;
        let registrations = registrationData ? parseInt(registrationData) : 85;
        
        // Increment visitor count for this session
        visitors += 1;
        
        // Store the updated count
        localStorage.setItem('visitorCount', visitors.toString());
        localStorage.setItem('registrationCount', registrations.toString());
        
        setVisitorCount(visitors);
        setCompletedRegistrations(registrations);
      } catch (error) {
        console.error('Error managing analytics data:', error);
        // Fallback values
        setVisitorCount(150);
        setCompletedRegistrations(85);
      }
    };
    
    fetchVisitorStats();
  }, [pathname, searchParams]);

  // Check server connectivity and determine which backend to use
  const [serverStatus, setServerStatus] = useState('checking');
  const HOSTED_API_URL = 'https://nssf-backend-production.up.railway.app';

  // For production build, prioritize the Railway URL
  const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost';
  const [API_URL, setApiUrl] = useState(
    isProduction ?
      HOSTED_API_URL :
      (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001')
  );

  useEffect(() => {
    const checkServerConnectivity = async () => {
      console.log('Checking server connectivity...');
      setServerStatus('checking');

      try {
        // In production, try the hosted server first
        if (isProduction) {
          try {
            console.log('Testing hosted backend at:', HOSTED_API_URL);
            const hostedResponse = await fetch(`${HOSTED_API_URL}/health`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json'
              },
              signal: AbortSignal.timeout(5000)
            });

            if (hostedResponse.ok) {
              console.log('Hosted server is available!');
              setApiUrl(HOSTED_API_URL);
              setServerStatus('remote');
              toast.success('Connected to hosted backend server');
              return;
            }
          } catch (hostedError) {
            console.log('Hosted server not available:', hostedError.message);
          }
        } else {
          // In development, try local server first
          const localUrl = 'http://localhost:3001';
          console.log('Testing local backend at:', localUrl);

          try {
            const localResponse = await fetch(`${localUrl}/health`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json'
              },
              signal: AbortSignal.timeout(2000)
            });

            if (localResponse.ok) {
              console.log('Local server is available!');
              setApiUrl(localUrl);
              setServerStatus('local');
              toast.success('Connected to local backend server');
              return;
            }
          } catch (localError) {
            console.log('Local server not available:', localError.message);
          }
        }

        // If local fails, try hosted server
        try {
          console.log('Testing hosted backend at:', HOSTED_API_URL);

          const hostedResponse = await fetch(`${HOSTED_API_URL}/health`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            },
            signal: AbortSignal.timeout(5000)
          });

          if (hostedResponse.ok) {
            console.log('Hosted server is available!');
            setApiUrl(HOSTED_API_URL);
            setServerStatus('remote');
            toast.success('Connected to hosted backend server');
            return;
          }
        } catch (hostedError) {
          console.log('Hosted server not available:', hostedError.message);
        }

        // If both fail
        console.error('No backend servers available');
        setServerStatus('none');
        toast.error('Unable to connect to any backend server');
      } catch (error) {
        console.error('Server connectivity check failed:', error);
        setServerStatus('none');
        toast.error('Connection check failed');
      }
    };

    checkServerConnectivity();
  }, []);

  // Effect to monitor CAPTCHA status
  useEffect(() => {
    if (status === 'captcha_ready') {
      console.log('CAPTCHA is ready to display');

      // Ensure we're on step 2 when showing CAPTCHA
      if (step !== 2) {
        setStep(2);
      }
    }
  }, [status, step]);

  // Add a monitoring effect to check for completion status
  useEffect(() => {
    // Only run this check if we're on step 2 and processing is taking place
    if (step === 2 && loading && progress >= 85) {
      console.log('Progress monitoring active, current progress:', progress);

      // If progress is high but we're not moving to step 3, set up a check
      const completionCheck = setTimeout(() => {
        console.log('Performing completion check, progress:', progress, 'status:', status);

        // If we're at 100% progress or status is complete but still on step 2, force transition
        if ((progress >= 100 || status === 'complete') && step === 2) {
          console.log('Detected completion but still on step 2, forcing transition to step 3');

          // Ensure we have PDF data
          if (!pdfData && requestId) {
            console.log('Setting default PDF path in completion monitor');
            setPdfData(`${API_URL}/download-pdf/NSSF_${requestId}.pdf`);
          }

          // Force transition to step 3
          setStep(3);
          setStatus('complete');
          // Increment completed registrations count
          setCompletedRegistrations(prev => prev + 1);
          toast.success('Registration complete! Moving to final step.');
        }
      }, 3000); // Check after 3 seconds

      return () => clearTimeout(completionCheck);
    }
  }, [step, loading, progress, status, pdfData, requestId, API_URL]);

  // Add this effect to ensure transition to step 3 happens reliably
  useEffect(() => {
    // Only handle completion if we're not already on step 3
    if (step !== 3 && (status === 'complete' || progress >= 100)) {
      console.log('Completion condition detected, preparing transition to step 3');

      // Ensure we have PDF data
      if (!pdfData && requestId) {
        console.log('Setting default PDF URL path');
        setPdfData(`${API_URL}/download-pdf/NSSF_${requestId}.pdf`);
      }

      // Force transition to step 3 with a small delay
      setTimeout(() => {
        console.log('Transitioning to completion step');
        setStep(3);
        setStatus('complete');
        setProgress(100);

        // Show success message
        toast.success('Registration completed successfully!');

        // Clean up WebSocket connection
        if (wsRef.current) {
          console.log('Closing WebSocket connection after completion');
          setTimeout(() => {
            try {
              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.close();
              }
            } catch (e) {
              console.error('Error closing WebSocket:', e);
            }
          }, 1000);
        }
      }, 800);
    }
  }, [status, progress, step, requestId, pdfData, API_URL]);

  // WebSocket heartbeat to keep connection alive
  useEffect(() => {
    let pingInterval;

    if (wsConnected && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      // Send a ping every 25 seconds to keep connection alive
      pingInterval = setInterval(() => {
        try {
          wsRef.current.send(JSON.stringify({ type: 'ping' }));
          console.log('WebSocket ping sent');
        } catch (e) {
          console.error('WebSocket ping failed:', e);
        }
      }, 25000);
    }

    return () => {
      if (pingInterval) {
        clearInterval(pingInterval);
      }
    };
  }, [wsConnected]);

  // Function to get detailed progress description
  const getProgressDescription = (status, progress) => {
    if (status === 'starting') return 'Initializing automation process...';
    if (status === 'processing') {
      if (progress < 30) return 'Loading NSSF registration form...';
      if (progress < 60) return 'Filling in your registration details...';
      if (progress < 90) return 'Processing form submission...';
      return 'Generating your registration document...';
    }
    if (status === 'captcha_ready') return 'CAPTCHA verification required...';
    if (status === 'captcha_preparing') return 'Preparing CAPTCHA verification...';
    if (status === 'complete') return 'Registration completed successfully!';
    if (status === 'error') return processingError || 'Error occurred during processing. Please try again.';
    return `Processing ${progress}%`;
  };

  // Function to get progress description

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handlePersonalInfoSubmit = (e) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.firstName || !formData.surname || !formData.idNumber || !formData.dateOfBirth) {
      toast.error("Please fill in all required fields");
      return;
    }

    toast.success("Personal information saved successfully");
    setStep(2);
  };

  // Function to connect to WebSocket for real-time progress updates
  const connectWebSocket = (id) => {
    // Close any existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Create WebSocket connection
    try {
      // Convert http/https URL to WebSocket URL (ws/wss)
      const wsProtocol = API_URL.startsWith('https') ? 'wss' : 'ws';
      const wsBaseUrl = API_URL.replace(/^https?:\/\//, ''); // Remove http:// or https://
      const WS_URL = `${wsProtocol}://${wsBaseUrl}`;

      console.log(`Connecting to WebSocket: ${WS_URL}?id=${id}`);
      const socket = new WebSocket(`${WS_URL}?id=${id}`);
      wsRef.current = socket;

      socket.onopen = () => {
        console.log('WebSocket connection established');
        setWsConnected(true);
        toast.success('Connected to real-time progress updates');
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setWsConnected(false);
        toast.error('Error connecting to real-time updates. Falling back to polling.');
        // Fall back to polling
        startPolling(id);
      };

      socket.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        setWsConnected(false);

        // Check if we're at or near completion when the socket closes
        if (progress >= 90) {
          console.log('WebSocket closed but progress was already at/above 90%, attempting to complete process');

          // Force completion if we were close to done
          setStatus('complete');
          setProgress(100);

          // Create a direct download link using the requestId
          const pdfUrl = `/download-pdf/NSSF_${id}.pdf`;
          setPdfData(pdfUrl);

          // Force transition to step 3
          console.log('Forcing transition to step 3 due to WebSocket close at high progress');
          setTimeout(() => {
            toast.success('Registration completed successfully!');
            setStep(3);
          }, 500);
        }
        // If it wasn't a normal closure and we're not near completion, start polling
        else if (event.code !== 1000) {
          toast('Lost connection to server. Switching to polling updates.');
          startPolling(id);
        }
      };

      // WebSocket message handler
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);

          // Always update progress if provided
          if (data.progress !== undefined) {
            setProgress(data.progress);
          }

          // Process different message types
          switch (data.status) {
            // Connection messages
            case 'connected':
              console.log('WebSocket connection confirmed with ID:', data.requestId);
              break;

            // Progress updates
            case 'processing':
            case 'starting':
              setStatus(data.status);
              break;

            // CAPTCHA handling - chunked approach
            case 'captcha_preparing':
              console.log('CAPTCHA is being prepared...');
              setCaptchaImage('');
              setCaptchaText('');
              setCaptchaLoading(true);
              setStatus('captcha_preparing');
              break;

            case 'captcha_chunks_start':
              console.log(`CAPTCHA will be sent in ${data.totalChunks} chunks`);
              setCaptchaChunks([]);
              setExpectedChunks(data.totalChunks);
              setCaptchaLoading(true);
              setStatus('captcha_preparing');
              break;

            case 'captcha_chunk':
              // Add this chunk to our collection
              setCaptchaChunks(prev => [...prev, data.chunk]);
              console.log(`Received CAPTCHA chunk ${data.chunkNum}`);
              break;

            case 'captcha_chunks_end':
              // This is the final chunk - assemble the full image
              const assembledImage = [...captchaChunks, data.chunk].join('');
              console.log(`Assembled complete CAPTCHA image from ${captchaChunks.length + 1} chunks (${assembledImage.length} bytes)`);

              // Set the image and status
              setCaptchaImage(assembledImage);
              setStatus('captcha_ready');
              setCaptchaLoading(false);

              // Reset chunking state
              setCaptchaChunks([]);
              setExpectedChunks(0);

              // Notify user to enter CAPTCHA
              toast('Please enter the CAPTCHA text shown in the image', {
                icon: '🔤',
                duration: 6000,
                style: {
                  backgroundColor: '#3b82f6',
                  color: 'white'
                }
              });
              break;

            // Normal (non-chunked) CAPTCHA handling
            case 'captcha_ready':
              if (data.captchaImage) {
                console.log(`Received complete CAPTCHA image (${data.captchaImage.length} bytes)`);
                setCaptchaImage(data.captchaImage.trim());
                setStatus('captcha_ready');
                setCaptchaLoading(false);

                // Ensure we're on step 2 when showing CAPTCHA
                if (step !== 2) {
                  setStep(2);
                }

                // Notify user
                toast('Please enter the CAPTCHA text shown in the image', {
                  icon: '🔤',
                  duration: 6000,
                  style: {
                    backgroundColor: '#3b82f6',
                    color: 'white'
                  }
                });
              }
              break;

            case 'captcha_received':
              console.log('CAPTCHA submission acknowledged by server');
              setStatus('processing');
              break;

            // Completion handling
            case 'complete':
              console.log('Received completion notification:', data);

              // Store the requestId for later reference
              if (data.requestId) {
                console.log('Storing requestId from completion data:', data.requestId);
                setRequestId(data.requestId);
              }

              // Set PDF data if available
              if (data.data && data.data.pdfUrl) {
                console.log('Setting PDF URL from completion data:', data.data.pdfUrl);
                // Ensure the URL is absolute and uses the correct requestId
                const pdfUrl = data.data.pdfUrl.startsWith('http') ?
                  data.data.pdfUrl :
                  `${API_URL}${data.data.pdfUrl}`;
                console.log('Final PDF URL:', pdfUrl);
                setPdfData(pdfUrl);
              } else if (data.pdfUrl) {
                console.log('Setting direct PDF URL:', data.pdfUrl);
                // Ensure the URL is absolute
                const pdfUrl = data.pdfUrl.startsWith('http') ?
                  data.pdfUrl :
                  `${API_URL}${data.pdfUrl.startsWith('/') ? '' : '/'}${data.pdfUrl}`;
                console.log('Final PDF URL:', pdfUrl);
                setPdfData(pdfUrl);
              } else {
                // Default PDF path as fallback
                // Use the stored ID number as a more reliable identifier if requestId is null
                const safeRequestId = requestId || `ID${formData.idNumber}`;
                console.log(`Using default PDF path with ID: ${safeRequestId}`);
                const pdfUrl = `${API_URL}/download-pdf/NSSF_${safeRequestId}.pdf`;
                console.log('Final PDF URL:', pdfUrl);
                setPdfData(pdfUrl);
              }

              // Update status and progress
              setStatus('complete');
              setProgress(100);

              // Start transition to completion step if not already there
              if (step !== 3) {
                console.log('Transitioning to completion step (step 3)');
                setTimeout(() => {
                  setStep(3);
                  toast.success('Registration completed successfully!');
                }, 500);
              }
              break;

            // Error handling
            case 'error':
              console.error('Received error from server:', data.message);
              setProcessingError(data.message);
              setStatus('error');
              setLoading(false);

              // Display error toast
              toast.error(
                <div className="flex flex-col gap-2">
                  <span className="font-semibold text-white">Registration Failed</span>
                  <span className="text-sm text-gray-100">{data.message || 'An unexpected error occurred'}</span>
                </div>,
                {
                  duration: 5000,
                  style: {
                    background: '#dc2626',
                    color: 'white',
                    padding: '16px',
                    borderRadius: '8px',
                  }
                }
              );
              break;

            // Heartbeat response
            case 'pong':
              console.log('Received pong response from server');
              break;

            // Handle unrecognized status types
            default:
              console.log(`Received message with unhandled status: ${data.status}`);
              // Still update status to maintain synchronization
              if (data.status) {
                setStatus(data.status);
              }
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error, event.data);
          // Try to recover if possible
          try {
            // Check if it might be binary data or corrupted JSON
            if (typeof event.data === 'string' && event.data.includes('captchaImage')) {
              console.log('Message appears to contain CAPTCHA data but failed to parse');
              toast.error('Failed to process CAPTCHA data');
              setCaptchaLoading(false);
            }
          } catch (recoveryError) {
            console.error('Error during error recovery:', recoveryError);
          }
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      // Start polling as fallback
      startPolling(id);
    }
  };

  // Fallback polling mechanism if WebSockets fail
  const startPolling = (id) => {
    console.log('Starting polling for status updates...');

    // Clear any existing interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${API_URL}/submit-form/status?id=${id}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          console.error('Polling response not OK:', response.status);
          return;
        }

        const result = await response.json();
        console.log('Polling update:', result);

        if (result.status) {
          setProgress(result.progress || 0);
          setStatus(result.status);

          // Handle CAPTCHA if present
          if (result.status === 'captcha_ready' && result.captchaImage) {
            setCaptchaImage(result.captchaImage);
            setStatus('captcha_ready');
            setCaptchaLoading(false);

            toast('Please enter the CAPTCHA text to continue', {
              icon: '🔤',
              duration: 6000
            });
          }

          // Handle completion
          if (result.status === 'complete') {
            if (result.pdfData) {
              setPdfData(result.pdfData);
            } else if (result.pdfUrl) {
              setPdfData(result.pdfUrl);
            } else {
              setPdfData(`${API_URL}/download-pdf/NSSF_${id}.pdf`);
            }

            setStatus('complete');
            setProgress(100);

            // Clear the interval once complete
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 3000); // Poll every 3 seconds

    // Store the interval reference for cleanup
    pollIntervalRef.current = pollInterval;
  };

  // Function to submit CAPTCHA text
  const submitCaptcha = async () => {
    if (!requestId || !captchaText) {
      toast.error('Please enter the CAPTCHA text');
      return;
    }

    try {
      const loadingToast = toast.loading('Submitting CAPTCHA...');

      // Create a FormData object to ensure compatibility with the backend
      const formData = new FormData();
      formData.append('requestId', requestId);
      formData.append('captchaText', captchaText);

      console.log(`Submitting CAPTCHA to ${API_URL}/submit-captcha`);

      const response = await fetch(`${API_URL}/submit-captcha`, {
        method: 'POST',
        body: formData,
      });

      toast.dismiss(loadingToast);

      if (response.ok) {
        toast.success('CAPTCHA submitted successfully');

        // Also send via WebSocket if connected
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'captcha',
            requestId,
            captchaText
          }));
        }

        // Clear CAPTCHA data
        setCaptchaImage('');
        setCaptchaText('');
        setStatus('processing');
      } else {
        toast.error('Failed to submit CAPTCHA');
      }
    } catch (error) {
      console.error('Error submitting CAPTCHA:', error);
      toast.error('Error submitting CAPTCHA');
    }
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();

    // Show loading toast
    const loadingToast = toast.loading('Submitting form...');

    // Validate required fields
    if (!formData.firstName || !formData.surname || !formData.idNumber ||
      !formData.dateOfBirth || !formData.mobileNumber || !formData.email) {
      toast.dismiss(loadingToast);
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setProgress(0);
    setStatus('starting');
    setProcessingError(null);

    try {
      console.log('Submitting form to:', `${API_URL}/submit-form`);
      console.log('Form data:', formData);

      // First check API health
      try {
        const healthCheck = await fetch(`${API_URL}/health`, {
          method: 'GET',
          timeout: 5000
        });

        if (!healthCheck.ok) {
          toast.dismiss(loadingToast);
          toast.error('Backend server unavailable');
          setLoading(false);
          return;
        }
      } catch (healthError) {
        toast.dismiss(loadingToast);
        toast.error('Cannot connect to backend');
        setLoading(false);
        return;
      }

      // Submit the form
      const response = await fetch(`${API_URL}/submit-form`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify(formData),
      });

      // Log the request data for debugging
      console.log('Sending form data with ID number:', formData.idNumber);

      console.log('Response status:', response.status);

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      const responseText = await response.text();
      console.log('Response text:', responseText);

      try {
        const result = responseText ? JSON.parse(responseText) : { success: false };

        if (response.ok && result.success) {
          // Success toast
          toast.success('Form submitted successfully!');

          // Store the request ID for WebSocket connection
          setRequestId(result.requestId);

          // Connect to WebSocket
          connectWebSocket(result.requestId);

          // Set processing state
          setStatus('processing');
          setStep(2);
        } else {
          // Detailed error message from server
          const errorMessage = result.message || 'Failed to process request';
          console.error('Form submission error:', errorMessage);
          toast.error(`Error: ${errorMessage}`);
          setLoading(false);
        }
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        toast.error('Received invalid response from server');
        setLoading(false);
      }
    } catch (error) {
      // Network or other errors
      console.error('Form submission error:', error);
      toast.dismiss(loadingToast);

      toast.error(error.message || 'Failed to connect to server');
      setLoading(false);
    }
  };

  const downloadPdf = () => {
    if (!pdfData) {
      toast.error("No PDF data available");
      return;
    }

    try {
      // Create a descriptive filename
      const fileName = `NSSF_Registration_${formData.idNumber}_${formData.surname}_${formData.firstName}.pdf`;

      // Check if it's a URL path or base64 data
      if (typeof pdfData === 'string' && (pdfData.startsWith('/') || pdfData.startsWith('http'))) {
        // It's a URL path
        const fullUrl = pdfData.startsWith('http')
          ? pdfData
          : `${API_URL}${pdfData}`;

        console.log(`Downloading PDF from URL: ${fullUrl}`);

        // Create and click a download link
        const downloadLink = document.createElement('a');
        downloadLink.href = fullUrl;
        downloadLink.target = '_blank';
        downloadLink.download = fileName;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      } else {
        // It's base64 data
        const linkSource = `data:application/pdf;base64,${pdfData}`;
        const downloadLink = document.createElement('a');
        downloadLink.href = linkSource;
        downloadLink.download = fileName;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }

      toast.success("Your PDF is being downloaded");
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    }
  };

  // Refresh CAPTCHA image
  const refreshCaptcha = () => {
    if (!requestId) return;

    // Clear current CAPTCHA
    setCaptchaImage('');
    setCaptchaText('');
    setCaptchaLoading(true);

    // Show loading toast
    const loadingToast = toast.loading('Refreshing CAPTCHA...');

    // Set a timeout to clear loading state if no response
    const timeoutId = setTimeout(() => {
      setCaptchaLoading(false);
      toast.dismiss(loadingToast);
      toast.error('CAPTCHA refresh timed out. Please try again.');
    }, 10000);

    // Request new CAPTCHA via WebSocket if connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'refresh_captcha',
        requestId
      }));

      // Listen for CAPTCHA response
      const captchaResponseHandler = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.status === 'captcha_ready' && data.captchaImage) {
            clearTimeout(timeoutId);
            toast.dismiss(loadingToast);
            wsRef.current.removeEventListener('message', captchaResponseHandler);
          }
        } catch (error) {
          console.error('Error parsing CAPTCHA refresh response:', error);
        }
      };

      wsRef.current.addEventListener('message', captchaResponseHandler);
    } else {
      clearTimeout(timeoutId);
      setCaptchaLoading(false);
      toast.dismiss(loadingToast);
      toast.error('Connection lost. Please try again.');
    }
  };

  // Step display component
  const StepIndicator = ({ currentStep }: { currentStep: number }) => {
    return (
      <div className="flex justify-between items-center w-full py-2">
        <div className={`flex flex-col items-center ${currentStep >= 1 ? 'text-primary' : 'text-gray-400'}`}>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep >= 1 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>
            <UserIcon className="h-4 w-4" />
          </div>
          <span className="text-xs font-medium mt-1">Info</span>
        </div>

        <div className={`flex-1 h-1 mx-2 ${currentStep >= 2 ? 'bg-primary' : 'bg-gray-200'}`}></div>

        <div className={`flex flex-col items-center ${currentStep >= 2 ? 'text-primary' : 'text-gray-400'}`}>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep >= 2 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>
            <Clock className="h-4 w-4" />
          </div>
          <span className="text-xs font-medium mt-1">Process</span>
        </div>

        <div className={`flex-1 h-1 mx-2 ${currentStep >= 3 ? 'bg-primary' : 'bg-gray-200'}`}></div>

        <div className={`flex flex-col items-center ${currentStep >= 3 ? 'text-primary' : 'text-gray-400'}`}>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep >= 3 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>
            <CheckCircle className="h-4 w-4" />
          </div>
          <span className="text-xs font-medium mt-1">Done</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Add Toaster for notifications */}
      <Toaster position="bottom-right" toastOptions={{
        success: {
          style: {
            background: 'green',
            color: 'white',
          },
          duration: 5000,
        },
        error: {
          style: {
            background: '#ff4b4b',
            color: 'white',
          },
          duration: 5000,
        },
      }} />

      {/* Navbar with logo */}
      {/* Navbar with logo */}
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-2">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center">
              <img
                src="/images/logo.png"
                alt="Hadeazy Digital Logo"
                className="h-10 sm:h-16 w-auto"
              />
              <span className="ml-2 text-sm sm:text-base font-semibold text-gray-800">NSSF Registration</span>
            </div>
            {/* Right side of navbar - server status and visitor count */}
            <div className="flex items-center space-x-4">
              <VisitorCount count={visitorCount} />
              
              {serverStatus === 'checking' && (
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-amber-500 mr-1 animate-pulse"></div>
                  <p className="text-xs text-amber-600">Checking...</p>
                </div>
              )}
              {serverStatus === 'none' && (
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-red-500 mr-1"></div>
                  <p className="text-xs text-red-600">No server</p>
                </div>
              )}
              {(serverStatus === 'local' || serverStatus === 'remote') && (
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-green-500 mr-1 animate-pulse"></div>
                  <p className="text-xs text-green-600">
                    {serverStatus === 'local' ? 'Local' : 'Connected'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-3 sm:px-6 max-w-3xl py-4 sm:py-8">
        <Card className="shadow-lg">
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
            <div>
              <CardTitle className="text-lg sm:text-xl">NSSF Registration</CardTitle>
              <CardDescription className="text-sm">
                {step === 1 && 'Enter your personal information to begin.'}
                {step === 2 && 'Please complete your contact information.'}
                {step === 3 && 'Your NSSF registration is complete!'}
              </CardDescription>
            </div>
          </CardHeader>

          {/* Step indicator */}
          <div className="px-4 sm:px-6 pb-2">
            <StepIndicator currentStep={step} />
          </div>

          <CardContent className="px-4 sm:px-6">
            {step === 1 && (
              <form onSubmit={handlePersonalInfoSubmit} className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Personal Information</h3>
                  <p className="text-sm text-muted-foreground">
                    Enter your ID card details below.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      className='uppercase'
                      value={formData.firstName}
                      onChange={handleInputChange}
                      placeholder="CLINTON"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="middleName">Middle Name</Label>
                    <Input
                      id="middleName"
                      name="middleName"
                      className='uppercase'
                      value={formData.middleName}
                      onChange={handleInputChange}
                      placeholder="OTIENO"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="surname">Surname *</Label>
                    <Input
                      id="surname"
                      name="surname"
                      className='uppercase'
                      value={formData.surname}
                      onChange={handleInputChange}
                      placeholder="OCHIENG"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="idNumber">ID Number *</Label>
                    <Input
                      id="idNumber"
                      name="idNumber"
                      value={formData.idNumber}
                      onChange={handleInputChange}
                      placeholder="38454141"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                    <Input
                      id="dateOfBirth"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                      placeholder="DD/MM/YYYY"
                      required
                    />
                    <p className="text-xs text-muted-foreground">Format: DD/MM/YYYY (e.g., 10/06/2001)</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="districtOfBirth">District of Birth *</Label>
                    <Input
                      id="districtOfBirth"
                      name="districtOfBirth"
                      value={formData.districtOfBirth}
                      onChange={handleInputChange}
                      placeholder="Nairobi"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={serverStatus === 'none' || serverStatus === 'checking'}
                >
                  Continue to Contact Information
                </Button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleSubmitForm} className="space-y-6">
                {/* Progress Indicator */}
                {/* Progress Indicator */}
                {loading && (
                  <div className="mb-4 sm:mb-6">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs sm:text-sm font-medium">Progress</span>
                      <span className="text-xs sm:text-sm font-medium">{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <div className="space-y-1 mt-1">
                      <p className="text-xs sm:text-sm text-gray-500">
                        {getProgressDescription(status, progress)}
                      </p>
                    </div>
                  </div>
                )}

                {/* CAPTCHA Input Component */}
                {/* CAPTCHA Input Component */}
                {status === 'captcha_ready' && (
                  <div className="mb-4 p-3 sm:p-4 border rounded-lg shadow-sm bg-white">
                    <h3 className="text-base sm:text-lg font-semibold mb-2">CAPTCHA Verification</h3>
                    <p className="text-xs sm:text-sm text-gray-600 mb-3">Enter the text shown below to continue.</p>

                    <div className="flex flex-col items-center mb-3">
                      {captchaLoading || !captchaImage ? (
                        <div className="h-16 w-full flex items-center justify-center">
                          <div className="animate-spin h-6 w-6 border-3 border-primary border-t-transparent rounded-full"></div>
                          <span className="ml-2 text-sm">Loading CAPTCHA...</span>
                        </div>
                      ) : (
                        <div className="border border-gray-300 p-2 mb-3 bg-white rounded relative w-full flex justify-center">
                          <img
                            src={`data:image/png;base64,${captchaImage}`}
                            alt="CAPTCHA Verification"
                            className="max-w-full h-auto"
                            style={{ minWidth: '160px', minHeight: '50px', maxWidth: '100%' }}
                            onError={(e) => {
                              console.error('CAPTCHA image failed to load');
                              e.target.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
                              toast.error('Failed to load CAPTCHA image');
                              // Try to refresh automatically
                              setTimeout(refreshCaptcha, 1500);
                            }}
                          />
                          <button
                            type="button"
                            onClick={refreshCaptcha}
                            className="absolute top-1 right-1 p-1 bg-gray-100 rounded-full hover:bg-gray-200"
                            title="Refresh CAPTCHA"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                        </div>
                      )}

                      <div className="flex w-full items-end gap-2">
                        <div className="grid w-full gap-1.5">
                          <Label htmlFor="captchaText">CAPTCHA Text</Label>
                          <Input
                            id="captchaText"
                            value={captchaText}
                            onChange={(e) => setCaptchaText(e.target.value)}
                            placeholder="Enter text from image"
                            className="w-full"
                            autoFocus
                          />
                        </div>
                        <Button
                          type="button"
                          onClick={submitCaptcha}
                          disabled={!captchaText || captchaLoading}
                          className="whitespace-nowrap"
                        >
                          Submit
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Contact Information</h3>
                  <p className="text-sm text-muted-foreground">
                    Please provide your contact details to complete your registration.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2 space-y-2">
                    <h4 className="font-medium text-sm">Registered Personal Information</h4>
                    <div className="grid grid-cols-1 gap-3 p-3 bg-gray-50 rounded-md sm:grid-cols-3">
                      <div className="mb-2 sm:mb-0">
                        <p className="text-xs text-muted-foreground">Full Name</p>
                        <p className="text-sm uppercase truncate">{formData.surname} {formData.firstName} {formData.middleName}</p>
                      </div>
                      <div className="mb-2 sm:mb-0">
                        <p className="text-xs text-muted-foreground">ID Number</p>
                        <p className="text-sm">{formData.idNumber}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Date of Birth</p>
                        <p className="text-sm">{formData.dateOfBirth}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mobileNumber">Mobile Number *</Label>
                    <Input
                      type="tel"
                      id="mobileNumber"
                      name="mobileNumber"
                      value={formData.mobileNumber}
                      onChange={handleInputChange}
                      placeholder="0712345678"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex items-center justify-center"
                    disabled={loading || status === 'captcha_ready'}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={loading || status === 'captcha_ready'}
                  >
                    {loading ? 'Processing...' : 'Submit Registration'}
                  </Button>
                </div>
              </form>
            )}

            {step === 3 && (
              <div className="space-y-4 sm:space-y-6">
                <div className="flex items-center justify-center">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                  </div>
                </div>

                <div className="text-center space-y-1 sm:space-y-2">
                  <h3 className="text-base sm:text-lg font-medium">Registration Complete!</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Your NSSF registration has been processed successfully.
                  </p>
                  <div className="flex justify-center space-x-4 mt-2">
                    <RegistrationCount count={completedRegistrations} />
                  </div>
                </div>

                <Card className="bg-gray-50">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between flex-wrap sm:flex-nowrap gap-2">
                      <div className="flex items-center space-x-3">
                        <div className="p-1.5 sm:p-2 bg-red-100 rounded-full">
                          <FileIcon className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-medium">NSSF Registration Document</p>
                          <p className="text-xs text-muted-foreground">PDF Document</p>
                        </div>
                      </div>
                      <Button
                        onClick={downloadPdf}
                        className="flex items-center text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
                      >
                        <Download className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Download
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Button
                  type="button"
                  className="w-full"
                  onClick={() => {
                    setStep(1);
                    setFormData({
                      firstName: '',
                      middleName: '',
                      surname: '',
                      idNumber: '',
                      dateOfBirth: '',
                      email: '',
                      mobileNumber: '',
                    });
                    setStatus('idle');
                    setProgress(0);
                    setPdfData(null);
                    setRequestId(null);
                  }}
                >
                  Start New Registration
                </Button>
              </div>
            )}

            <CardFooter className="px-4 sm:px-6 pt-4 flex flex-col space-y-2 justify-between text-center">
              <div className="flex justify-center space-x-4">
                {step === 3 && <RegistrationCount count={completedRegistrations} />}
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mx-auto">
                Automated Registration System for NSSF Kenya. Made with ❤️ by <a href="https://hadeazy.com" target="_blank" rel="noopener noreferrer" className="font-bold text-blue-500 hover:underline">Hadeazy</a>.
              </p>
            </CardFooter>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}