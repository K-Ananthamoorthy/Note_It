'use client'

import { useState, useEffect } from 'react'
import { auth, db, googleAuthProvider } from '@/lib/firebase'
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, setDoc, collection, addDoc, query, where, onSnapshot, deleteDoc, updateDoc } from 'firebase/firestore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart, Calendar, Edit, Trash2, PlusCircle, User, LogOut, Menu } from 'lucide-react'

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
}

type CareData = {
  waterIntake: number
  sleepHours: number
  exerciseMinutes: number
  date: string
}

export default function Home() {
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState<Note[]>([])
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [careData, setCareData] = useState<CareData>({
    waterIntake: 0,
    sleepHours: 0,
    exerciseMinutes: 0,
    date: new Date().toISOString().split('T')[0],
  })
  const [careLogs, setCareLogs] = useState<CareData[]>([])
  const [profileName, setProfileName] = useState('')
  const [profileEmail, setProfileEmail] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.email!)
        const userSnap = await getDoc(userRef)
        
        if (userSnap.exists()) {
          setUser(userSnap.data() as UserData)
        } else {
          const newUser: UserData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email!,
            displayName: firebaseUser.displayName || 'User',
            role: 'user',
          }
          await setDoc(userRef, newUser)
          setUser(newUser)
        }
        setProfileName(firebaseUser.displayName || '')
        setProfileEmail(firebaseUser.email || '')
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
          notesData.push({ id: doc.id, ...doc.data() } as Note)
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

  const signIn = async () => {
    try {
      await signInWithPopup(auth, googleAuthProvider)
    } catch (error) {
      console.error('Error signing in with Google', error)
    }
  }

  const signOutUser = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error('Error signing out', error)
    }
  }

  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (editingNote) {
      await updateDoc(doc(db, `users/${user.email}/notes`, editingNote.id), { title: noteTitle, content: noteContent })
      setEditingNote(null)
    } else {
      await addDoc(collection(db, `users/${user.email}/notes`), {
        title: noteTitle,
        content: noteContent,
        createdAt: Date.now(),
      })
    }
    setNoteTitle('')
    setNoteContent('')
  }

  const handleNoteEdit = (note: Note) => {
    setEditingNote(note)
    setNoteTitle(note.title)
    setNoteContent(note.content)
  }

  const handleNoteDelete = async (id: string) => {
    if (!user) return
    await deleteDoc(doc(db, `users/${user.email}/notes`, id))
  }

  const handleCareSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    await setDoc(doc(db, `users/${user.email}/care`, careData.date), careData)
    setCareData({
      waterIntake: 0,
      sleepHours: 0,
      exerciseMinutes: 0,
      date: new Date().toISOString().split('T')[0],
    })
  }

  const handleCareInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setCareData(prev => ({ ...prev, [name]: Number(value) }))
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      await updateDoc(doc(db, 'users', user.email), {
        displayName: profileName,
        email: profileEmail,
      })
      console.log('Profile updated:', { profileName, profileEmail })
    } catch (error) {
      console.error('Error updating profile:', error)
    }
  }

  if (loading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">Welcome to NoteWell</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center mb-6">Your personal note-taking and wellness companion</p>
            <Button onClick={signIn} className="w-full">Sign In with Google</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-100 to-purple-100">
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">NoteWell</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600 hidden md:inline">Welcome, {user.displayName}</span>
            <Button onClick={signOutUser} variant="outline" size="sm" className="hidden md:flex">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
            <Button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} variant="outline" size="sm" className="md:hidden">
              <Menu className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="md:hidden bg-white shadow-md p-4">
          <p className="text-sm text-gray-600 mb-2">Welcome, {user.displayName}</p>
          <Button onClick={signOutUser} variant="outline" size="sm" className="w-full">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      )}

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList className="flex flex-wrap justify-center gap-2">
            <TabsTrigger value="dashboard" className="flex-grow md:flex-grow-0">Dashboard</TabsTrigger>
            <TabsTrigger value="notes" className="flex-grow md:flex-grow-0">Notes</TabsTrigger>
            <TabsTrigger value="care" className="flex-grow md:flex-grow-0">Personal Care</TabsTrigger>
            {/* <TabsTrigger value="profile" className="flex-grow md:flex-grow-0">Profile</TabsTrigger> */}
          </TabsList>

          <TabsContent value="dashboard">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                      <p>Exercise: {log.exerciseMinutes} minutes</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
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
                      <p className="text-sm text-gray-600 truncate">{note.content}</p>
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
                  <Button type="submit" className="w-full md:w-auto">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    {editingNote ? 'Update Note' : 'Add Note'}
                  </Button>
                </form>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {notes.map((note) => (
                    <Card key={note.id}>
                      <CardHeader>
                        <CardTitle>{note.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="mb-4">{note.content}</p>
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
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
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
                      onChange={(e) => setProfileEmail(e.target.value)}
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
        </Tabs>
      </main>
    </div>
  )
}