import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import logoUrl from "../assets/logo.png";

const demoAccounts = [
  { email: 'admin@test.com', role: 'Admin', icon: 'fas fa-user-shield' },
  { email: 'retailer@test.com', role: 'Retailer', icon: 'fas fa-store' },
  { email: 'shop@test.com', role: 'Shop Owner', icon: 'fas fa-shopping-cart' },
  { email: 'delivery@test.com', role: 'Delivery Boy', icon: 'fas fa-truck' }
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
            <h1 className="text-2xl font-bold text-foreground">ShopLink</h1>
            <p className="text-muted-foreground mt-2">B2B Commerce Platform</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-sm font-medium text-foreground">Email</Label>
              <Input 
                id="email"
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email" 
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
        </CardContent>
      </Card>
    </div>
  );
}
