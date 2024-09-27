'use client'

import { useState, useEffect } from 'react'
import { auth, db, googleAuthProvider } from '@/lib/firebase'
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, setDoc, collection, addDoc, query, onSnapshot, deleteDoc, updateDoc, getDocs } from 'firebase/firestore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart, Calendar, Edit, Trash2, PlusCircle, User, LogOut, Menu, Moon, Sun, Settings } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
// import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { useRouter } from 'next/navigation'

type UserData = {
  uid: string
  email: string
  displayName: string
  role: 'user' | 'admin'
  
  
}

type Note = {
  id: string
  title: string
  content: string
  createdAt: number
  tags: string[]
}

type CareData = {
  waterIntake: number
  sleepHours: number
  exerciseMinutes: number
  mood: 'great' | 'good' | 'okay' | 'bad'
  date: string
}

type Reminder = {
  id: string
  title: string
  date: string
  time: string
  completed: boolean
}

export default function Home() {
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState<Note[]>([])
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [noteTags, setNoteTags] = useState<string[]>([])
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [careData, setCareData] = useState<CareData>({
    waterIntake: 0,
    sleepHours: 0,
    exerciseMinutes: 0,
    mood: 'okay',
    date: new Date().toISOString().split('T')[0],
  })
  const [careLogs, setCareLogs] = useState<CareData[]>([])
  const [profileName, setProfileName] = useState('')
  const [profileEmail, setProfileEmail] = useState('')
  // const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [newReminder, setNewReminder] = useState({ title: '', date: '', time: '' })
  const [allUsers, setAllUsers] = useState<UserData[]>([])
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.email!)
        const userSnap = await getDoc(userRef)
        
        let userData: UserData
        if (userSnap.exists()) {
          userData = userSnap.data() as UserData
        } else {
          userData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email!,
            displayName: firebaseUser.displayName || 'User',
            role: firebaseUser.email === 'ananthamurthy2004@gmail.com' ? 'admin' : 'user',
            
          }
          await setDoc(userRef, userData)
        }
        setUser(userData)
        setProfileName(userData.displayName)
        setProfileEmail(userData.email)
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (user) {
      const q = query(collection(db, `users/${user.email}/notes`))
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const notesData: Note[] = []
        querySnapshot.forEach((doc) => {
          const data = doc.data()
          notesData.push({
            id: doc.id,
            title: data.title,
            content: data.content,
            createdAt: data.createdAt,
            tags: data.tags || []
          })
        })
        setNotes(notesData.sort((a, b) => b.createdAt - a.createdAt))
      })
      return () => unsubscribe()
    }
  }, [user])

  useEffect(() => {
    if (user) {
      const q = query(collection(db, `users/${user.email}/care`))
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const logsData: CareData[] = []
        querySnapshot.forEach((doc) => {
          logsData.push(doc.data() as CareData)
        })
        setCareLogs(logsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))
      })
      return () => unsubscribe()
    }
  }, [user])

  useEffect(() => {
    if (user) {
      const q = query(collection(db, `users/${user.email}/reminders`))
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const remindersData: Reminder[] = []
        querySnapshot.forEach((doc) => {
          remindersData.push({ id: doc.id, ...doc.data() } as Reminder)
        })
        setReminders(remindersData.sort((a, b) => new Date(a.date + 'T' + a.time).getTime() - new Date(b.date + 'T' + b.time).getTime()))
      })
      return () => unsubscribe()
    }
  }, [user])

  useEffect(() => {
    if (user?.role === 'admin') {
      const fetchAllUsers = async () => {
        const usersSnapshot = await getDocs(collection(db, 'users'))
        const usersData: UserData[] = []
        usersSnapshot.forEach((doc) => {
          usersData.push(doc.data() as UserData)
        })
        setAllUsers(usersData)
      }
      fetchAllUsers()
    }
  }, [user])

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  useEffect(() => {
    if ('Notification' in window) {
      Notification.requestPermission()
    }
  }, [])

  const signIn = async () => {
    try {
      await signInWithPopup(auth, googleAuthProvider)
    } catch (error) {
      console.error('Error signing in with Google', error)
      toast.error('Failed to sign in. Please try again.')
    }
  }

  const signOutUser = async () => {
    try {
      await signOut(auth)
      toast.success('Signed out successfully')
    } catch (error) {
      console.error('Error signing out', error)
      toast.error('Failed to sign out. Please try again.')
    }
  }

  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      const noteData = {
        title: noteTitle,
        content: noteContent,
        tags: noteTags,
        createdAt: Date.now(),
      }

      if (editingNote) {
        await updateDoc(doc(db, `users/${user.email}/notes`, editingNote.id), noteData)
        setEditingNote(null)
        toast.success('Note updated successfully')
      } else {
        await addDoc(collection(db, `users/${user.email}/notes`), noteData)
        toast.success('Note added successfully')
      }
      setNoteTitle('')
      setNoteContent('')
      setNoteTags([])
    } catch (error) {
      console.error('Error saving note:', error)
      toast.error('Failed to save note. Please try again.')
    }
  }

  const handleNoteEdit = (note: Note) => {
    setEditingNote(note)
    setNoteTitle(note.title)
    setNoteContent(note.content)
    setNoteTags(note.tags || [])
  }

  const handleNoteDelete = async (id: string) => {
    if (!user) return
    try {
      await deleteDoc(doc(db, `users/${user.email}/notes`, id))
      toast.success('Note deleted successfully')
    } catch (error) {
      console.error('Error deleting note:', error)
      toast.error('Failed to delete note. Please try again.')
    }
  }

  const handleCareSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      await setDoc(doc(db, `users/${user.email}/care`, careData.date), careData)
      setCareData({
        waterIntake: 0,
        sleepHours: 0,
        exerciseMinutes: 0,
        mood: 'okay',
        date: new Date().toISOString().split('T')[0],
      })
      toast.success('Care data logged successfully')
    } catch (error) {
      console.error('Error logging care data:', error)
      toast.error('Failed to log care data. Please try again.')
    }
  }

  const handleCareInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setCareData(prev => ({ ...prev, [name]: name === 'mood' ? value : Number(value) }))
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      await updateDoc(doc(db, 'users', user.email), {
        displayName: profileName,
      })
      toast.success('Profile updated successfully')
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Failed to update profile. Please try again.')
    }
  }

  const handleReminderSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      const reminderData = {
        ...newReminder,
        completed: false,
      }
      await addDoc(collection(db, `users/${user.email}/reminders`), reminderData)
      setNewReminder({ title: '', date: '', time: '' })
      toast.success('Reminder added successfully')
      scheduleNotification(reminderData)
    } catch (error) {
      console.error('Error adding reminder:', error)
      toast.error('Failed to add reminder. Please try again.')
    }
  }

  const toggleReminderComplete = async (reminder: Reminder) => {
    if (!user) return

    try {
      await updateDoc(doc(db, `users/${user.email}/reminders`, reminder.id), {
        completed: !reminder.completed,
      })
      toast.success(`Reminder marked as ${reminder.completed ? 'incomplete' : 'complete'}`)
    } catch (error) {
      console.error('Error updating reminder:', error)
      toast.error('Failed to update reminder. Please try again.')
    }
  }

  const deleteReminder = async (id: string) => {
    if (!user) return

    try {
      await deleteDoc(doc(db, `users/${user.email}/reminders`, id))
      toast.success('Reminder deleted successfully')
    } catch (error) {
      console.error('Error deleting reminder:', error)
      toast.error('Failed to delete reminder. Please try again.')
    }
  }

  const scheduleNotification = (reminder: { title: string; date: string; time: string }) => {
    const now = new Date()
    const reminderDate = new Date(`${reminder.date}T${reminder.time}`)
    const timeUntilReminder = reminderDate.getTime() - now.getTime()

    if (timeUntilReminder > 0) {
      setTimeout(() => {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Reminder', { body: reminder.title })
        } else {
          toast.info(`Reminder: ${reminder.title}`)
        }
      }, timeUntilReminder)
    }
  }

  const filteredNotes = notes.filter(note => 
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (loading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600 dark:from-blue-900 dark:to-purple-900">
        <Card className="w[100%]max-w-md">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">MemoMe</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center mb-6">Your Buddy </p>
            <Button onClick={signIn} className="w-[100%]">Sign In with Google</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-200 ${darkMode ? 'dark' : ''}`}>
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          {/* App Name */}
          
         <a href="/"><h1  className="text-2xl font-bold text-gray-800 dark:text-white">MemoMe</h1></a> 
          
          {/* Profile and Menu */}
          <div className="flex items-center space-x-4">
            {/* Profile */}
            <div className="flex items-center space-x-2">
              {/* <img src={user.profilePicture} alt="Profile" className="w-8 h-8 rounded-full" /> */}
              <span className="hidden md:inline text-gray-800 dark:text-white">{user.displayName}</span>
            </div>
  
            {/* Dark Mode Toggle */}
            <Button onClick={() => setDarkMode(!darkMode)} variant="outline" size="icon" className="hidden md:flex">
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            {/* Sign Out Button */}
            <Button onClick={signOutUser} variant="outline" size="sm" className="hidden md:flex">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
  
            {/* Mobile Menu */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="md:hidden">
                  <Menu className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Menu</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Welcome, {user.displayName}</p>
                  <Button onClick={() => setDarkMode(!darkMode)} variant="outline" size="sm" className="w-full mb-2">
                    {darkMode ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
                    {darkMode ? 'Light Mode' : 'Dark Mode'}
                  </Button>
                
                  <Button onClick={signOutUser} variant="outline" size="sm" className="w-full">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>
  
  
  


      <main className="container mx-auto px-4 py-8">
  <Tabs defaultValue="dashboard" className="space-y-4">
    {/* Regular Tabs List for larger screens */}
    <div className="hidden sm:block">
      <TabsList className="flex flex-wrap justify-center gap-2">
        <TabsTrigger value="dashboard" className="flex-grow md:flex-grow-0">Dashboard</TabsTrigger>
        <TabsTrigger value="notes" className="flex-grow md:flex-grow-0">Notes</TabsTrigger>
        <TabsTrigger value="care" className="flex-grow md:flex-grow-0">Personal Care</TabsTrigger>
        <TabsTrigger value="reminders" className="flex-grow md:flex-grow-0">Reminders</TabsTrigger>
        {user.role === 'admin' && (
          <TabsTrigger value="admin" className="flex-grow md:flex-grow-0">Admin</TabsTrigger>
        )}
      </TabsList>
    </div>

    {/* Mobile Sliding Bottom Navigation */}
    <div className="block sm:hidden fixed bottom-0 left-0 w-full bg-gray-100 dark:bg-gray-800 shadow-md">
      <TabsList className="flex justify-around p-2">
        <TabsTrigger value="dashboard" className="text-center flex-grow">
          <span className="block w-full">Dashboard</span>
        </TabsTrigger>
        <TabsTrigger value="notes" className="text-center flex-grow">
          <span className="block w-full">Notes</span>
        </TabsTrigger>
        <TabsTrigger value="care" className="text-center flex-grow">
          <span className="block w-full">Personal Care</span>
        </TabsTrigger>
        <TabsTrigger value="reminders" className="text-center flex-grow">
          <span className="block w-full">Reminders</span>
        </TabsTrigger>
        {/* <TabsTrigger value="profile" className="text-center flex-grow">
          <span className="block w-full">Profile</span>
        </TabsTrigger> */}
        {user.role === 'admin' && (
          <TabsTrigger value="admin" className="text-center flex-grow">
            <span className="block w-full">Admin</span>
          </TabsTrigger>
        )}
      </TabsList>
    </div>

    {/* Tab Content */}
    <TabsContent value="dashboard">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Recent Personal Care Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart className="w-6 h-6 mr-2" />
              Recent Personal Care Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            {careLogs.slice(0, 5).map((log, index) => (
              <div key={index} className="mb-4 last:mb-0">
                <p className="font-semibold">{log.date}</p>
                <p>Water: {log.waterIntake} glasses</p>
                <p>Sleep: {log.sleepHours} hours</p>
                <p>Exercise: {log.exerciseMinutes}</p>
                <p>Mood: {log.mood}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Edit className="w-6 h-6 mr-2" />
              Recent Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {notes.slice(0, 3).map((note) => (
              <div key={note.id} className="mb-4 last:mb-0">
                <h3 className="font-semibold">{note.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                  {note.content}
                </p>
                {note.tags && note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {note.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </TabsContent>





          <TabsContent value="notes">
            <Card>
              <CardHeader>
                <CardTitle>My Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleNoteSubmit} className="mb-6 space-y-4">
                  <Input
                    type="text"
                    placeholder="Note Title"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                  />
                  <Textarea
                    placeholder="Note Content"
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    rows={4}
                  />
                  <Input
                    type="text"
                    placeholder="Tags (comma-separated)"
                    value={noteTags.join(', ')}
                    onChange={(e) => setNoteTags(e.target.value.split(',').map(tag => tag.trim()))}
                  />
                  <Button type="submit" className="w-full md:w-auto">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    {editingNote ? 'Update Note' : 'Add Note'}
                  </Button>
                </form>
                <div className="mb-4">
                  <Input
                    type="text"
                    placeholder="Search notes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredNotes.map((note) => (
                    <Card key={note.id}>
                      <CardHeader>
                        <CardTitle>{note.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="mb-4">{note.content}</p>
                        {note.tags && note.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-4">
                            {note.tags.map((tag, index) => (
                              <span key={index} className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex justify-end space-x-2">
                          <Button onClick={() => handleNoteEdit(note)} size="sm" variant="outline">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button onClick={() => handleNoteDelete(note.id)} size="sm" variant="destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="care">
            <Card>
              <CardHeader>
                <CardTitle>Personal Care Tracker</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCareSubmit} className="space-y-4 mb-8">
                  <div>
                    <label htmlFor="date" className="block text-sm font-medium mb-1">Date</label>
                    <Input
                      id="date"
                      type="date"
                      name="date"
                      value={careData.date}
                      onChange={(e) => setCareData(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label htmlFor="waterIntake" className="block text-sm font-medium mb-1">Water Intake (glasses)</label>
                    <Input
                      id="waterIntake"
                      type="number"
                      name="waterIntake"
                      value={careData.waterIntake}
                      onChange={handleCareInputChange}
                      min="0"
                    />
                  </div>
                  <div>
                    <label htmlFor="sleepHours" className="block text-sm font-medium mb-1">Sleep (hours)</label>
                    <Input
                      id="sleepHours"
                      type="number"
                      name="sleepHours"
                      value={careData.sleepHours}
                      onChange={handleCareInputChange}
                      min="0"
                      max="24"
                    />
                  </div>
                  <div>
                    <label htmlFor="exerciseMinutes" className="block text-sm font-medium mb-1">Exercise (minutes)</label>
                    <Input
                      id="exerciseMinutes"
                      type="number"
                      name="exerciseMinutes"
                      value={careData.exerciseMinutes}
                      onChange={handleCareInputChange}
                      min="0"
                    />
                  </div>
                  <div>
                    <label htmlFor="mood" className="block text-sm font-medium mb-1">Mood</label>
                    <Select name="mood" value={careData.mood} onValueChange={(value) => setCareData(prev => ({ ...prev, mood: value as 'great' | 'good' | 'okay' | 'bad' }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your mood" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="great">Great</SelectItem>
                        <SelectItem value="good">Good</SelectItem>
                        <SelectItem value="okay">Okay</SelectItem>
                        <SelectItem value="bad">Bad</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full md:w-auto">
                    <Calendar className="w-4 h-4 mr-2" />
                    Log Care Data
                  </Button>
                </form>
                <div>
                  <h3 className="text-lg font-semibold mb-4">Recent Logs</h3>
                  <div className="space-y-4">
                    {careLogs.slice(0, 7).map((log, index) => (
                      <Card key={index}>
                        <CardContent className="flex justify-between items-center">
                          <div>
                            <p className="font-semibold">{log.date}</p>
                            <p>Water: {log.waterIntake} glasses</p>
                            <p>Sleep: {log.sleepHours} hours</p>
                            <p>Exercise: {log.exerciseMinutes} minutes</p>
                            <p>Mood: {log.mood}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reminders">
            <Card>
              <CardHeader>
                <CardTitle>Reminders</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleReminderSubmit} className="space-y-4 mb-8">
                  <Input
                    type="text"
                    placeholder="Reminder Title"
                    value={newReminder.title}
                    onChange={(e) => setNewReminder(prev => ({ ...prev, title: e.target.value }))}
                  />
                  <Input
                    type="date"
                    value={newReminder.date}
                    onChange={(e) => setNewReminder(prev => ({ ...prev, date: e.target.value }))}
                  />
                  <Input
                    type="time"
                    value={newReminder.time}
                    onChange={(e) => setNewReminder(prev => ({ ...prev, time: e.target.value }))}
                  />
                  <Button type="submit" className="w-full md:w-auto">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Add Reminder
                  </Button>
                </form>
                <div className="space-y-4">
                  {reminders.map((reminder) => (
                    <Card key={reminder.id}>
                      <CardContent className="flex justify-between items-center">
                        <div>
                          <p className={`font-semibold ${reminder.completed ? 'line-through' : ''}`}>{reminder.title}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">{reminder.date} at {reminder.time}</p>
                        </div>
                        <div className="flex space-x-2">
                          <Button onClick={() => toggleReminderComplete(reminder)} size="sm" variant="outline">
                            {reminder.completed ? 'Undo' : 'Complete'}
                          </Button>
                          <Button onClick={() => deleteReminder(reminder.id)} size="sm" variant="destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>My Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium mb-1">Name</label>
                    <Input
                      id="name"
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
                    <Input
                      id="email"
                      type="email"
                      value={profileEmail}
                      disabled
                    />
                  </div>
                  <Button type="submit" className="w-full md:w-auto">
                    <User className="w-4 h-4 mr-2" />
                    Update Profile
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {user.role === 'admin' && (
            <TabsContent value="admin">
              <Card>
                <CardHeader>
                  <CardTitle>Admin Panel</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => router.push('/admin')} className="mb-4">
                    <Settings className="w-4 h-4 mr-2" />
                    Go to Admin Dashboard
                  </Button>
                  <h3 className="text-lg font-semibold mb-4">All Users</h3>
                  <div className="space-y-4">
                    {allUsers.map((user) => (
                      <Card key={user.uid}>
                        <CardContent className="flex justify-between items-center">
                          <div>
                            <p className="font-semibold">{user.displayName}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">{user.email}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">Role: {user.role}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </main>
      <ToastContainer position="bottom-right" />
    </div>
  )
}