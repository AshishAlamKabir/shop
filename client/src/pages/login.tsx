import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import logoUrl from "../assets/logo.png";

const demoAccounts = [
  { email: 'admin@test.com', role: 'Admin', icon: 'fas fa-user-shield' },
  { email: 'wholesaler@test.com', role: 'Wholesaler', icon: 'fas fa-store' },
  { email: 'shop@test.com', role: 'Shop Owner', icon: 'fas fa-shopping-cart' },
  { email: 'delivery@test.com', role: 'Delivery Boy', icon: 'fas fa-truck' }
];

export default function Login() {
  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Registration state
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regRole, setRegRole] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  
  const { login } = useAuth();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await login(email, password);
      toast({ title: "Login successful!", description: "Welcome to ShopLink" });
    } catch (error: any) {
      toast({ 
        title: "Login failed", 
        description: error.message || "Invalid credentials",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (regPassword !== regConfirmPassword) {
      toast({
        title: "Password mismatch",
        description: "Please make sure both passwords match",
        variant: "destructive"
      });
      return;
    }
    
    if (!regRole) {
      toast({
        title: "Role required",
        description: "Please select your role",
        variant: "destructive"
      });
      return;
    }
    
    setIsRegistering(true);
    
    try {
      await apiRequest('POST', '/api/auth/register', {
        email: regEmail,
        phone: regPhone || null,
        passwordHash: regPassword,
        fullName: regFullName,
        role: regRole
      });
      
      toast({
        title: "Registration successful!",
        description: "You can now login with your credentials"
      });
      
      // Clear registration form and switch to login tab
      setRegEmail('');
      setRegPhone('');
      setRegPassword('');
      setRegConfirmPassword('');
      setRegFullName('');
      setRegRole('');
      
      // Auto-fill login form with registered email
      setEmail(regEmail);
      
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const fillLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    if (demoEmail === 'admin@test.com') setPassword('admin123');
    else if (demoEmail === 'retailer@test.com') setPassword('retailer123');
    else if (demoEmail === 'shop@test.com') setPassword('shop123');
    else if (demoEmail === 'delivery@test.com') setPassword('delivery123');
    else setPassword('password123');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/5 to-accent/10">
      <Card className="w-full max-w-md mx-4 shadow-xl">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 flex items-center justify-center mx-auto mb-4">
              <img src={logoUrl} alt="ShopLink Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Shop Now</h1>
            <p className="text-muted-foreground mt-2">B2B Commerce Platform</p>
          </div>
          
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" data-testid="tab-login">Login</TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-register">Register</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="space-y-4 mt-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-sm font-medium text-foreground">Email or Phone</Label>
                  <Input 
                    id="email"
                    type="text" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email or phone number" 
                    required
                    data-testid="input-email"
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label htmlFor="password" className="text-sm font-medium text-foreground">Password</Label>
                  <Input 
                    id="password"
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password" 
                    required
                    data-testid="input-password"
                    className="mt-2"
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                  data-testid="button-login"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                      Signing In...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>
              
              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-sm text-muted-foreground mb-3 text-center">Demo Accounts</p>
                <div className="space-y-2">
                  {demoAccounts.map((account) => (
                    <Button
                      key={account.email}
                      variant="outline"
                      onClick={() => fillLogin(account.email)}
                      className="w-full justify-start text-sm"
                      data-testid={`button-demo-${account.role.toLowerCase().replace(' ', '-')}`}
                    >
                      <i className={`${account.icon} mr-3`}></i>
                      <span className="font-medium">{account.role}:</span>
                      <span className="ml-1">{account.email}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="register" className="space-y-4 mt-6">
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <Label htmlFor="reg-fullname" className="text-sm font-medium text-foreground">Full Name</Label>
                  <Input 
                    id="reg-fullname"
                    type="text" 
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="Enter your full name" 
                    required
                    data-testid="input-reg-fullname"
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label htmlFor="reg-email" className="text-sm font-medium text-foreground">Email</Label>
                  <Input 
                    id="reg-email"
                    type="email" 
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="Enter your email" 
                    required
                    data-testid="input-reg-email"
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label htmlFor="reg-phone" className="text-sm font-medium text-foreground">Phone Number (Optional)</Label>
                  <Input 
                    id="reg-phone"
                    type="tel" 
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="Enter your phone number" 
                    data-testid="input-reg-phone"
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label htmlFor="reg-role" className="text-sm font-medium text-foreground">Role</Label>
                  <Select value={regRole} onValueChange={setRegRole} required>
                    <SelectTrigger className="mt-2" data-testid="select-reg-role">
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WHOLESALER">Wholesaler</SelectItem>
                      <SelectItem value="SHOP_OWNER">Shop Owner</SelectItem>
                      <SelectItem value="DELIVERY_BOY">Delivery Boy</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="reg-password" className="text-sm font-medium text-foreground">Password</Label>
                  <Input 
                    id="reg-password"
                    type="password" 
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Create a password" 
                    required
                    data-testid="input-reg-password"
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label htmlFor="reg-confirm-password" className="text-sm font-medium text-foreground">Confirm Password</Label>
                  <Input 
                    id="reg-confirm-password"
                    type="password" 
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Confirm your password" 
                    required
                    data-testid="input-reg-confirm-password"
                    className="mt-2"
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isRegistering}
                  data-testid="button-register"
                >
                  {isRegistering ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                      Creating Account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
