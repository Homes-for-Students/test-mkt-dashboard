import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, KeyRound, ArrowRight, Loader2, Lock } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [showPassword, setShowPassword] = useState(false);
  const [_, setLocation] = useLocation();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      if (data.token) {
        localStorage.setItem("auth_token", data.token);
      }
      window.location.href = "/";
    },
    onError: (err) => {
      toast.error(err.message || "Invalid credentials. Please try again.");
    },
  });

  const requestOtpMutation = trpc.auth.requestOtp.useMutation({
    onSuccess: () => {
      setStep("otp");
      toast.success("Passcode sent to your email!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to send passcode. Please try again.");
    }
  });

  const verifyOtpMutation = trpc.auth.verifyOtp.useMutation({
    onSuccess: (data) => {
      if (data.token) {
        localStorage.setItem("auth_token", data.token);
      }
      window.location.href = "/";
    },
    onError: (err) => {
      toast.error(err.message || "Invalid passcode. Please try again.");
    },
  });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    if (showPassword) {
      if (!password) return;
      loginMutation.mutate({ email, password });
    } else {
      requestOtpMutation.mutate({ email });
    }
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || otpCode.length !== 6) return;
    verifyOtpMutation.mutate({ email, code: otpCode });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
      {/* Subtle Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-100/40 blur-[100px]" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[60%] rounded-full bg-orange-100/30 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-[420px] z-10 px-4"
      >
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-[0_8px_40px_rgb(0,0,0,0.04)] rounded-3xl p-8 sm:p-10">

          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="mx-auto bg-white shadow-sm border border-slate-100 p-3 rounded-2xl w-24 h-24 flex items-center justify-center mb-6"
            >
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </motion.div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">Welcome</h1>
            <p className="text-sm text-slate-500 font-medium">
              {step === "email" ? "Sign in to HFS reporting dashboard" : "Enter the 6-digit code sent to your email"}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {step === "email" ? (
              <motion.form
                key="email-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleFormSubmit}
                className="space-y-5"
              >
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider ml-1">Email</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                        <Mail className="h-5 w-5" strokeWidth={1.5} />
                      </div>
                      <input
                        type="email"
                        placeholder="name@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                        required
                      />
                    </div>
                  </div>

                  <AnimatePresence>
                    {showPassword && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className="space-y-1.5 overflow-hidden"
                      >
                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider ml-1">Password</label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                            <Lock className="h-5 w-5" strokeWidth={1.5} />
                          </div>
                          <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-11 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                            required={showPassword}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="pt-2 flex flex-col gap-3">
                  {!showPassword ? (
                    <>
                      <button
                        type="submit"
                        disabled={requestOtpMutation.isPending}
                        className="w-full bg-[#1a2b4c] hover:bg-[#2a3b5c] text-white rounded-xl py-3.5 font-semibold text-sm transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {requestOtpMutation.isPending ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            Get code
                          </>
                        )}
                      </button>

                      <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-slate-200"></div>
                        <span className="flex-shrink-0 mx-4 text-xs font-medium text-slate-400">OR</span>
                        <div className="flex-grow border-t border-slate-200"></div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowPassword(true)}
                        className="w-full bg-white hover:bg-slate-50 text-[#1a2b4c] border border-slate-200 rounded-xl py-3.5 font-semibold text-sm transition-colors duration-200 disabled:opacity-70 flex items-center justify-center gap-2"
                      >
                        Sign in with password
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="submit"
                        disabled={loginMutation.isPending}
                        className="w-full bg-[#1a2b4c] hover:bg-[#2a3b5c] text-white rounded-xl py-3.5 font-semibold text-sm transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {loginMutation.isPending ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Signing in...
                          </>
                        ) : (
                          <>
                            Sign in
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </button>

                      <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-slate-200"></div>
                        <span className="flex-shrink-0 mx-4 text-xs font-medium text-slate-400">OR</span>
                        <div className="flex-grow border-t border-slate-200"></div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowPassword(false)}
                        className="w-full bg-white hover:bg-slate-50 text-[#1a2b4c] border border-slate-200 rounded-xl py-3.5 font-semibold text-sm transition-colors duration-200 disabled:opacity-70 flex items-center justify-center gap-2"
                      >
                        Get code instead
                      </button>
                    </>
                  )}
                </div>
              </motion.form>
            ) : (
              <motion.form
                key="otp-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleOtpSubmit}
                className="space-y-5"
              >
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider ml-1">One-Time Passcode</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                      <KeyRound className="h-5 w-5" strokeWidth={1.5} />
                    </div>
                    <input
                      type="text"
                      placeholder="123456"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl text-lg tracking-[0.5em] text-center font-mono text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={verifyOtpMutation.isPending || otpCode.length !== 6}
                  className="w-full bg-[#1a2b4c] hover:bg-[#2a3b5c] text-white rounded-xl py-3.5 mt-4 font-semibold text-sm transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {verifyOtpMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      Verify and Sign In
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setStep("email")}
                  className="w-full text-center text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors"
                >
                  Back to email
                </button>
              </motion.form>
            )}
          </AnimatePresence>

        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-slate-400 font-medium">
            Protected by internal HFS security protocols.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
