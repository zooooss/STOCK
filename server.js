const express = require('express');
const app = express();
const { MongoClient, ObjectId } = require('mongodb'); //오브젝트아이디함수가져오는거
const methodOverride = require('method-override');
const bcrypt = require('bcrypt');
require('dotenv').config();
//아래는 소켓 라이브러리 셋팅 문법
const { createServer } = require('http');
const { Server } = require('socket.io');
const server = createServer(app);
const io = new Server(server);

app.use(methodOverride('_method'));
app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const MongoStore = require('connect-mongo');
//connect-mongo 라이브러리로 세션관리.

const sessionMiddleware = session({
    secret: '암호화에 쓸 비번',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60 * 60 * 1000, httpOnly: true, secure: false },
    // 개발 환경에서는 false, 프로덕션에서는 true
    store: MongoStore.create({
        mongoUrl: process.env.DB_URL,
        dbName: 'stock',
    }),
});
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

//아래 두 단락은 사진업로드 관련
const { S3Client } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
const s3 = new S3Client({
    region: 'ap-northeast-2',
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_ACCESS_SECRETKEY,
    },
});

const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: 'codingmonkeybucket',
        key: function (req, file, cb) {
            cb(null, Date.now().toString()); //업로드시 파일명 변경가능
            // 파일명을 안겹치게하려면 랜덤문자를 해싱해서 집어넣던가 아니면 현재시간을 섞거나 등등
            // 원래 파일명은 req.file 하면 나옴
        },
    }),
});

let db;
const url = process.env.DB_URL;
new MongoClient(url)
    .connect()
    .then((client) => {
        console.log('DB연결성공');
        db = client.db('stock');

        server.listen(process.env.PORT, () => {
            console.log('http://localhost:8080에서 서버 실행중');
        });
    })
    .catch((err) => {
        console.log(err);
    });
//미드웨어 사용을 위한 함수
function CheckLogIn(req, res, next) {
    if (req.user) {
        next();
    } else {
        res.send(`
      <script>
        alert('로그인 후 사용 가능합니다.');
        window.location.href = '/login';
      </script>
    `);
        //회원 세션 없는 경우 팝업 띄우고 로그인페이지로 이동
    }
}

app.get('/', (req, res) => {
    res.render('login.ejs');
});

// app.use(CheckLogIn); 이 코드 사용시 아래에 있는 모든 api의 요청과 응답 사이에 미드웨어 실행! 보통 서버코드 가장 위에 적용시켜줌!
app.get('/chat', CheckLogIn, async (req, res) => {
    try {
        // 현재 유저가 member로 포함된 채팅방 찾기
        let chatRoom = await db.collection('chat').findOne({
            member: req.user._id,
        });

        if (!chatRoom) {
            return res.status(404).send('채팅방을 찾을 수 없습니다.');
        }

        // 메시지에 사용자 이름 추가
        const messagesWithNames = await Promise.all(
            chatRoom.messages.map(async (msg) => {
                const user = await db.collection('user').findOne({ _id: new ObjectId(msg.sender) });
                return {
                    ...msg,
                    senderName: user ? user.firstName : 'Unknown',
                    senderId: msg.sender.toString(),
                };
            })
        );

        res.render('chat.ejs', {
            result: {
                ...chatRoom,
                messages: messagesWithNames,
            },
            currentUserId: req.user._id.toString(),
        });
    } catch (err) {
        console.error('채팅 페이지 로드 에러:', err);
        res.status(500).send('서버 에러');
    }
});

app.get('/main', (req, res) => {
    res.sendFile(__dirname + '/index.html');
}); //_dirname은 현재 프로젝트 절대 경로라는 뜻. server.js 담긴 폴더.

//아래 코드는 미드웨어 적용한 것.
app.get('/list', CheckLogIn, async (req, res) => {
    let result = await db.collection('customer').find().toArray();
    console.log('현재 로그인된 사용자:', req.user); // 여기는 로그인 후엔 값이 찍혀야 함
    if (!req.user) return res.redirect('/login');
    res.render('list.ejs', { customer: result });
});

app.get('/write', (req, res) => {
    res.render('write.ejs');
});

//미들웨어 사용해서 img1을 가진 이미지 들어오면 s3에 자동 업로드 해 줌!
app.post('/write', upload.single('img1'), async (req, res) => {
    console.log(req.body);
    try {
        if (req.body.title == '') {
            res.send('제목입력하시오');
        } else {
            const newPost = await db
                .collection('newpost')
                .insertOne({ title: req.body.title, content: req.body.content, img: req.file.location });
            res.redirect(`/showimg/${newPost.insertedId}`);
        }
    } catch (e) {
        console.log(e);
        res.status(500).send('서버에러');
    }
});

app.get('/showimg/:id', async (req, res) => {
    let result = await db.collection('newpost').findOne({ _id: new ObjectId(req.params.id) });
    res.render('showimg.ejs', { result: result });
});

app.get('/detail/:aaaa', async (req, res) => {
    try {
        let result = await db.collection('customer').findOne({ _id: new ObjectId(req.params.aaaa) }); //toArray는 모든 도큐먼트 다 가져와주세요 이고, findOne은 도큐먼트 1개 가져옴.
        console.log(result);
        if (result == null) {
            console.log(e);
            res.status(404).send('잘못된 URL 입력하셨습니다.');
        }
        res.render('detail.ejs', { currentparam: result });
    } catch (e) {
        console.log(e);
        res.status(404).send('잘못된 URL 입력하셨습니다.');
    }
});

app.get('/edit/:id', async (req, res) => {
    let result = await db.collection('customer').findOne({ _id: new ObjectId(req.params.id) });
    console.log(result);
    res.render('edit.ejs', { result: result });
});

app.put('/edit', async (req, res) => {
    //예외처리 필요.
    const title = req.body.title;
    const content = req.body.content;
    console.log({ title, content });
    await db
        .collection('customer')
        .updateOne({ _id: new ObjectId(req.body.id) }, { $set: { email: title, ph: content } });
});

app.delete('/delete', async (req, res) => {
    console.log('삭제 요청 받음:', req.query);
    await db.collection('customer').deleteOne({ _id: new ObjectId(req.query.docid) });
    res.send('삭제완료');
});

app.get('/list/:id', async (req, res) => {
    let result = await db
        .collection('customer')
        .find()
        .skip((req.params.id - 1) * 2)
        .limit(2)
        .toArray();
    res.render('list.ejs', { customer: result });
});

passport.use(
    new LocalStrategy(async (입력한아이디, 입력한비번, cb) => {
        let result = await db.collection('user').findOne({ username: 입력한아이디 });
        if (!result) {
            return cb(null, false, { message: '아이디 DB에 없음' });
        }
        if (await bcrypt.compare(입력한비번, result.password)) {
            //여기 부분 잘 봐야함.
            return cb(null, result);
        } else {
            return cb(null, false, { message: '비번불일치' });
        }
    })
);

//아래 코드는 req.logIn()할 때 마다 실행, 로그인시 session document 발행
passport.serializeUser((user, done) => {
    // console.log(user);
    //아래 코드는 내부 코드를 비동기적으로 처리
    process.nextTick(() => {
        done(null, { id: user._id, username: user.username });
    });
});

//아래코드는 쿠키를 분석해주는 코드
//아래코드는 세션정보가 적힌 쿠키를 가진 유저가 요청을 보낼 때마다 실행됨.
passport.deserializeUser(async (user, done) => {
    let result = await db.collection('user').findOne({ _id: new ObjectId(user.id) });
    delete result.password;
    process.nextTick(() => {
        done(null, result);
    });
});

//이제 어느 api에서나 req.user하면 현재 로그인되어있는 유저의 정보를 알 수 있음.

app.get('/login', async (req, res) => {
    res.render('login.ejs');
});

app.post('/login', async (req, res, next) => {
    passport.authenticate('local', (error, user, info) => {
        if (error) return res.status(500).json(error);
        if (!user) return res.status(401).json(info.message);
        req.logIn(user, (err) => {
            if (err) return next(err);
            res.redirect('/chat');
        });
    })(req, res, next);
});
// 기존 deserializeUser와 login 코드는 유지

// ===== 오너 회원가입 =====
app.get('/signup/owner', (req, res) => {
    res.render('signup-owner.ejs');
});

app.post('/signup/owner', async (req, res) => {
    try {
        const { firstName, lastName, email, password, confirmPassword, restaurantName, phoneNumber } = req.body;

        // 1. 입력값 검증
        if (!firstName || !lastName || !email || !password || !restaurantName || !phoneNumber) {
            return res.status(400).send('All fields are required');
        }

        if (password !== confirmPassword) {
            return res.status(400).send('Passwords do not match');
        }

        if (password.length < 8) {
            return res.status(400).send('Password must be at least 8 characters long');
        }

        // 2. 이메일 중복 확인
        const existingUser = await db.collection('user').findOne({ email });
        if (existingUser) {
            return res.status(400).send('Email already exists');
        }

        // 3. Venue ID 생성 (6자리 랜덤 코드)
        const venueId = generateVenueId();

        // 4. 비밀번호 해싱
        const hashedPassword = await bcrypt.hash(password, 10);

        // 5. 레스토랑 정보 저장
        const restaurantResult = await db.collection('restaurants').insertOne({
            name: restaurantName,
            venueId: venueId,
            email: email,
            phoneNumber: phoneNumber,
            createdAt: new Date(),
            status: 'active',
        });

        // 6. 오너 계정 저장
        const userResult = await db.collection('user').insertOne({
            firstName: firstName,
            lastName: lastName,
            email: email,
            password: hashedPassword,
            phoneNumber: phoneNumber,
            role: 'owner',
            restaurantId: restaurantResult.insertedId,
            name: restaurantName,
            venueId: venueId,
            status: 'active',
            createdAt: new Date(),
        });

        // 7. 채팅방 생성 (새로 추가!)
        await db.collection('chat').insertOne({
            restaurantId: restaurantResult.insertedId,
            restaurantName: restaurantName,
            member: [userResult.insertedId], // 오너를 첫 멤버로 추가
            messages: [], // 빈 메시지 배열
            createdAt: new Date(),
        });
        // 7. Venue ID를 이메일로 전송 (나중에 구현)
        // await sendVenueIdEmail(email, venueId, restaurantName);

        res.redirect('/login');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// ===== 직원 회원가입 (1단계: Venue ID 입력) =====
app.get('/signup/employee', (req, res) => {
    res.render('signup-employee.ejs');
});

app.post('/verify-venue', async (req, res) => {
    try {
        const { venueId } = req.body;

        // Venue ID 검증
        const restaurant = await db.collection('restaurants').findOne({ venueId });

        if (!restaurant) {
            return res.status(404).json({ success: false, message: 'Invalid Venue ID' });
        }

        res.json({
            success: true,
            restaurantName: restaurant.name,
            restaurantId: restaurant._id,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ===== 직원 회원가입 (2단계: 정보 입력 및 승인 요청) =====
app.post('/signup/employee', async (req, res) => {
    try {
        const { firstName, lastName, email, password, confirmPassword, venueId, phoneNumber } = req.body;

        // 1. 입력값 검증
        if (!firstName || !lastName || !email || !password || !venueId || !phoneNumber) {
            return res.status(400).send('All fields are required');
        }

        if (password !== confirmPassword) {
            return res.status(400).send('Passwords do not match');
        }

        if (password.length < 8) {
            return res.status(400).send('Password must be at least 8 characters long');
        }

        // 2. 이메일 중복 확인
        const existingUser = await db.collection('user').findOne({ email });
        if (existingUser) {
            return res.status(400).send('Email already exists');
        }

        // 3. Venue ID 유효성 확인
        const restaurant = await db.collection('restaurants').findOne({ venueId });
        if (!restaurant) {
            return res.status(400).send('Invalid Venue ID');
        }

        // 4. 비밀번호 해싱
        const hashedPassword = await bcrypt.hash(password, 10);

        // 5. 직원 계정 저장 (pending 상태)
        await db.collection('user').insertOne({
            firstName: firstName,
            lastName: lastName,
            email: email,
            password: hashedPassword,
            phoneNumber: phoneNumber,
            role: 'employee',
            restaurantId: restaurant._id,
            restaurantName: restaurant.name,
            venueId: venueId,
            status: 'pending', // 오너 승인 대기
            createdAt: new Date(),
        });

        // 6. 오너에게 승인 요청 알림 생성
        const owner = await db.collection('user').findOne({
            restaurantId: restaurant._id,
            role: 'owner',
        });

        if (owner) {
            await db.collection('notifications').insertOne({
                userId: owner._id,
                type: 'employee_approval_request',
                message: `${firstName} ${lastName} has requested to join your restaurant`,
                employeeEmail: email,
                isRead: false,
                createdAt: new Date(),
            });
        }

        res.render('signup-pending.ejs', { restaurantName: restaurant.name });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// ===== 오너의 직원 승인 처리 =====
app.post('/approve-employee/:email', async (req, res) => {
    try {
        // 로그인 확인 및 오너 권한 확인
        if (!req.user || req.user.role !== 'owner') {
            return res.status(403).send('Access denied');
        }

        const employeeEmail = req.params.email;

        // 직원 상태를 active로 변경
        await db
            .collection('user')
            .updateOne(
                { email: employeeEmail, restaurantId: req.user.restaurantId },
                { $set: { status: 'active', approvedAt: new Date() } }
            );

        // 업데이트 후 다시 직원 정보 가져오기
        const employee = await db
            .collection('user')
            .findOne({ email: employeeEmail, restaurantId: req.user.restaurantId });

        // 채팅방에 직원 추가
        await db
            .collection('chat')
            .updateOne({ restaurantId: req.user.restaurantId }, { $addToSet: { member: employee._id } });

        console.log('✅ Employee approved and added to chat room');

        // 직원에게 승인 알림
        if (employee) {
            await db.collection('notifications').insertOne({
                userId: employee._id,
                type: 'approval_granted',
                message: 'Your account has been approved!',
                isRead: false,
                createdAt: new Date(),
            });
        }
        res.redirect('/mypage');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// ===== 승인 대기 직원 목록 조회 =====
app.get('/pending-employees', async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'owner') {
            return res.status(403).send('Access denied');
        }

        const pendingEmployees = await db
            .collection('user')
            .find({
                restaurantId: req.user.restaurantId,
                status: 'pending',
            })
            .toArray();

        res.render('pending-employees.ejs', { employees: pendingEmployees });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// ===== Venue ID 생성 함수 =====
function generateVenueId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let venueId = '';
    for (let i = 0; i < 6; i++) {
        venueId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return venueId;
}

// ===== 로그인 시 상태 확인 추가 =====
passport.use(
    new LocalStrategy(async (username, password, done) => {
        let result = await db.collection('user').findOne({ email: username });
        if (!result) {
            return done(null, false, { message: 'Invalid email or password' });
        }

        // 직원의 경우 승인 상태 확인
        if (result.role === 'employee' && result.status === 'pending') {
            return done(null, false, { message: 'Your account is pending approval' });
        }

        if (result.status === 'inactive') {
            return done(null, false, { message: 'Your account has been deactivated' });
        }

        if (await bcrypt.compare(password, result.password)) {
            return done(null, result);
        } else {
            return done(null, false, { message: 'Invalid email or password' });
        }
    })
);

app.get('/mypage', CheckLogIn, async (req, res) => {
    try {
        let result = req.user;
        console.log('현재 로그인된 사용자:', result);

        // 오너인 경우 승인 대기 중인 직원 수 조회
        let pendingCount = 0;
        if (result.role === 'owner') {
            pendingCount = await db.collection('user').countDocuments({
                restaurantId: result.restaurantId,
                status: 'pending',
            });
        }

        res.render('mypage.ejs', {
            user: result,
            userfirstname: result.firstName,
            pendingCount: pendingCount,
        });
    } catch (err) {
        console.error('마이페이지 로드 에러:', err);
        res.status(500).send('서버 에러');
    }
});

app.get('/orderlist', async (req, res) => {
    let suppliers = await db.collection('supplier').find().toArray();
    res.render('orderlist.ejs', {
        suppliers: suppliers,
        currentPath: req.path,
    });
});

io.engine.use(sessionMiddleware);

io.on('connection', (socket) => {
    console.log('🔌 socket connected');

    // 세션 정보 확인
    const session = socket.request.session;
    console.log('Session:', session);
    console.log('Session passport:', session?.passport);

    // 채팅 참여 요청
    socket.on('ask-join', async () => {
        try {
            const session = socket.request.session;
            const userId = session?.passport?.user?.id;

            if (!userId) {
                console.log('❌ 로그인 정보 없음');
                return;
            }

            // 현재 유저가 member로 포함된 채팅방 찾기
            const chatDoc = await db.collection('chat').findOne({
                member: new ObjectId(userId),
            });

            if (!chatDoc) {
                console.log('❌ 해당 유저의 채팅방 없음');
                return;
            }

            const roomId = chatDoc._id.toString();
            socket.join(roomId);

            // 유저 이름 가져오기
            const user = await db.collection('user').findOne({ _id: new ObjectId(userId) });
            console.log(`✅ 유저 ${user?.firstName || userId}가 방 ${roomId} 참여`);

            socket.emit('joined-room', roomId);
        } catch (err) {
            console.error('❌ ask-join 에러:', err);
        }
    });

    // 메시지 전송
    socket.on('send-message', async (data) => {
        try {
            const session = socket.request.session;
            const userId = session?.passport?.user?.id;

            if (!userId) {
                console.log('❌ 로그인 정보 없음');
                return;
            }

            // 현재 유저가 member로 포함된 채팅방 찾기
            const chatDoc = await db.collection('chat').findOne({
                member: new ObjectId(userId),
            });

            if (!chatDoc) {
                console.log('❌ 채팅방 없음');
                return;
            }

            // 유저 정보 가져오기
            const user = await db.collection('user').findOne({ _id: new ObjectId(userId) });

            if (!user) {
                console.log('❌ 유저 정보 없음');
                return;
            }

            const roomId = chatDoc._id.toString();

            const newMsg = {
                sender: new ObjectId(userId),
                senderName: user.firstName,
                text: data.text,
                createdAt: new Date(),
            };

            // DB에 메시지 저장
            await db.collection('chat').updateOne({ _id: chatDoc._id }, { $push: { messages: newMsg } });

            // 같은 방의 모든 유저에게 브로드캐스트
            io.to(roomId).emit('new-message', {
                ...newMsg,
                sender: newMsg.sender.toString(),
                senderId: userId.toString(),
            });

            console.log(`✅ 메시지 전송 완료: ${user.firstName} - ${data.text}`);
        } catch (err) {
            console.error('❌ send-message 에러:', err);
        }
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log('❌ 세션 종료 실패:', err);
            return res.status(500).send('Logout failed');
        }

        res.clearCookie('connect.sid'); // 세션 쿠키 삭제
        res.redirect('/login'); // 로그인 페이지로 이동
    });
});
