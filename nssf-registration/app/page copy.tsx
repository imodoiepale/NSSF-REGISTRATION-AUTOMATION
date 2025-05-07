'use client';

import { useState } from 'react';
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
import { toast } from 'sonner';
import { FileIcon, UserIcon, Clock, CheckCircle, ArrowLeft, Download } from 'lucide-react';

export default function Home() {
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
  const [pdfData, setPdfData] = useState<string | null>(null);
  // const { toast } = useToast();
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handlePersonalInfoSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.firstName || !formData.surname || !formData.idNumber || !formData.dateOfBirth) {
      toast(`{
        variant: "destructive",
        title: "Error",
        description: "Please fill in all required fields",
      }`);
      return;
    }
    
    toast(`{
      title: "Success",
      description: "Personal information saved successfully",
    }`);
    
    setStep(2);
  };

  const handleSubmitForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.mobileNumber || !formData.email) {
      toast(`{
        variant: "destructive",
        title: "Error",
        description: "Please fill in all required fields",
      }`);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/submit-form`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to submit form');
      }

      setPdfData(result.pdfData);
      
      toast(
        `title: "Success",
        description: "Form submitted and PDF generated successfully"`
      );
      
      setStep(3);
    } catch (err: any) {
      toast(`{
        variant: "destructive",
        title: "Error",
        description: err.message || 'An error occurred while submitting the form',
      }`);
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = () => {
    if (!pdfData) return;
    
    const linkSource = `data:application/pdf;base64,${pdfData}`;
    const downloadLink = document.createElement('a');
    const fileName = `NSSF_Registration_${formData.idNumber}.pdf`;

    downloadLink.href = linkSource;
    downloadLink.download = fileName;
    downloadLink.click();
    
    toast(`{
      title: "Downloaded",
      description: "Your PDF has been downloaded successfully",
    }`);
  };
  
  // Step display component
  const StepIndicator = () => (
    <div className="flex justify-between mb-8">
      <div className={`flex flex-col items-center ${step >= 1 ? 'text-primary' : 'text-gray-400'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>
          <UserIcon className={`w-4 h-4 ${step >= 1 ? 'text-white' : 'text-gray-500'}`} />
        </div>
        <span className="mt-2 text-xs font-medium">Personal Info</span>
      </div>
      <div className={`flex flex-col items-center ${step >= 2 ? 'text-primary' : 'text-gray-400'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>
          <Clock className={`w-4 h-4 ${step >= 2 ? 'text-white' : 'text-gray-500'}`} />
        </div>
        <span className="mt-2 text-xs font-medium">Contact Info</span>
      </div>
      <div className={`flex flex-col items-center ${step >= 3 ? 'text-primary' : 'text-gray-400'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>
          <CheckCircle className={`w-4 h-4 ${step >= 3 ? 'text-white' : 'text-gray-500'}`} />
        </div>
        <span className="mt-2 text-xs font-medium">Complete</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">NSSF Registration Automation</h1>
          <p className="mt-2 text-gray-600">Automated registration system for NSSF Kenya</p>
        </div>
        
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-center">Registration Process</CardTitle>
            <CardDescription className="text-center">Complete your NSSF registration in just a few steps</CardDescription>
            <StepIndicator />
          </CardHeader>
          
          <CardContent>
            {step === 1 && (
              <form onSubmit={handlePersonalInfoSubmit} className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Personal Information</h3>
                  <p className="text-sm text-muted-foreground">
                    Enter your ID card details below.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                >
                  Continue to Contact Information
                </Button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleSubmitForm} className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Contact Information</h3>
                  <p className="text-sm text-muted-foreground">
                    Please provide your contact details to complete your registration.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2 space-y-2">
                    <h4 className="font-medium text-sm">Registered Personal Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-gray-50 rounded-md">
                      <div>
                        <p className="text-xs text-muted-foreground">Full Name</p>
                        <p className="text-sm">{formData.surname} {formData.firstName} {formData.middleName}</p>
                      </div>
                      <div>
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

                <div className="flex space-x-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setStep(1)}
                    className="flex items-center"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1" 
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : 'Submit Registration'}
                  </Button>
                </div>
              </form>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="flex items-center justify-center">
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-medium">Registration Complete!</h3>
                  <p className="text-sm text-muted-foreground">
                    Your NSSF registration has been processed successfully. You can download your document below.
                  </p>
                </div>

                <Card className="bg-gray-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-red-100 rounded-full">
                          <FileIcon className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">NSSF Registration Document</p>
                          <p className="text-xs text-muted-foreground">PDF Document</p>
                        </div>
                      </div>
                      <Button 
                        onClick={downloadPdf} 
                        className="flex items-center"
                      >
                        <Download className="mr-2 h-4 w-4" /> Download
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Button 
                  type="button" 
                  className="w-full"
                  onClick={() => {
                    setStep(1);
                    setPdfData(null);
                    setFormData({
                      firstName: '',
                      middleName: '',
                      surname: '',
                      idNumber: '',
                      dateOfBirth: '',
                      districtOfBirth: '',
                      mobileNumber: '',
                      email: ''
                    });
                  }}
                >
                  Start New Registration
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}